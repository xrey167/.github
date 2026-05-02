use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::ai::{anthropic::AnthropicClient, openai::OpenAiClient, AiClient, AiRegistry};
use crate::api::client::ApiClient;
use crate::ratelimit::Scheduler;
use crate::secrets::{self, Credentials};
use crate::store::Store;

const DEFAULT_ANTHROPIC_MODEL: &str = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL: &str = "gpt-4o-mini";

pub struct AppState {
    pub credentials: Arc<RwLock<Option<Credentials>>>,
    pub api: Arc<ApiClient>,
    pub scheduler: Arc<Scheduler>,
    pub store: Arc<Store>,
    pub ai: Arc<AiRegistry>,
}

impl AppState {
    pub fn new(db_path: PathBuf) -> Self {
        let initial = secrets::load().unwrap_or_else(|e| {
            tracing::error!(error = %e, "failed to load credentials from keychain");
            None
        });
        let credentials = Arc::new(RwLock::new(initial));
        let scheduler = Arc::new(Scheduler::new());
        let api = Arc::new(ApiClient::new(credentials.clone(), scheduler.clone()));
        let store = Arc::new(
            Store::open(db_path).expect("failed to open DuckDB store at startup"),
        );
        let ai = Arc::new(AiRegistry::new());

        // Restore an AI client from the keychain at startup so /chat works
        // without a Settings round-trip. Anthropic wins when both providers
        // are configured — the user can flip via the Settings page.
        let initial_client: Option<Arc<dyn AiClient>> =
            match secrets::load_ai_key("anthropic") {
                Ok(Some(key)) => Some(Arc::new(AnthropicClient::new(
                    key,
                    DEFAULT_ANTHROPIC_MODEL.to_string(),
                ))),
                _ => match secrets::load_ai_key("openai") {
                    Ok(Some(key)) => Some(Arc::new(OpenAiClient::new(
                        key,
                        DEFAULT_OPENAI_MODEL.to_string(),
                    ))),
                    _ => None,
                },
            };
        if let Some(client) = initial_client {
            let ai_clone = ai.clone();
            tokio::spawn(async move {
                ai_clone.set(client).await;
            });
        }

        Self { credentials, api, scheduler, store, ai }
    }
}
