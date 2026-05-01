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
        let credentials = Arc::new(RwLock::new(crate::secrets::load().ok().flatten()));
        let api = Arc::new(ApiClient::new(credentials.clone()));
        Self { credentials, api }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
