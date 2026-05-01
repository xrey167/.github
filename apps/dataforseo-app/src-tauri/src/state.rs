use std::sync::Arc;
use tokio::sync::RwLock;

use crate::api::client::ApiClient;
use crate::secrets::Credentials;

pub struct AppState {
    pub credentials: Arc<RwLock<Option<Credentials>>>,
    pub api: Arc<ApiClient>,
}

impl AppState {
    pub fn new() -> Self {
        let initial = crate::secrets::load().unwrap_or_else(|e| {
            tracing::error!(error = %e, "failed to load credentials from keychain");
            None
        });
        let credentials = Arc::new(RwLock::new(initial));
        let api = Arc::new(ApiClient::new(credentials.clone()));
        Self { credentials, api }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
