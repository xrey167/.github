use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::api::client::ApiClient;
use crate::ratelimit::Scheduler;
use crate::secrets::Credentials;
use crate::store::Store;

pub struct AppState {
    pub credentials: Arc<RwLock<Option<Credentials>>>,
    pub api: Arc<ApiClient>,
    pub scheduler: Arc<Scheduler>,
    pub store: Arc<Store>,
}

impl AppState {
    pub fn new(db_path: PathBuf) -> Self {
        let initial = crate::secrets::load().unwrap_or_else(|e| {
            tracing::error!(error = %e, "failed to load credentials from keychain");
            None
        });
        let credentials = Arc::new(RwLock::new(initial));
        let scheduler = Arc::new(Scheduler::new());
        let api = Arc::new(ApiClient::new(credentials.clone(), scheduler.clone()));
        let store = Arc::new(
            Store::open(db_path).expect("failed to open DuckDB store at startup"),
        );
        Self { credentials, api, scheduler, store }
    }
}
