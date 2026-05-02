use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::ai::{anthropic::AnthropicClient, AiRegistry};
use crate::api::client::ApiClient;
use crate::ratelimit::Scheduler;
use crate::secrets::{self, Credentials};
use crate::store::Store;

const DEFAULT_ANTHROPIC_MODEL: &str = "claude-sonnet-4-6";

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

        // If we already have an Anthropic key in the keychain, register the
        // client at startup so /chat works without a Settings round-trip.
        if let Ok(Some(key)) = secrets::load_ai_key("anthropic") {
            let client = AnthropicClient::new(key, DEFAULT_ANTHROPIC_MODEL.to_string());
            let ai_clone = ai.clone();
            tokio::spawn(async move {
                ai_clone.set(Arc::new(client)).await;
            });
        }

        Self { credentials, api, scheduler, store, ai }
    }
}
