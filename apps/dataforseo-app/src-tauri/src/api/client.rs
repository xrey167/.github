use std::sync::Arc;
use tokio::sync::RwLock;

use crate::errors::{AppError, Result};
use crate::secrets::Credentials;

const BASE_URL: &str = "https://api.dataforseo.com";

pub struct ApiClient {
    http: reqwest::Client,
    credentials: Arc<RwLock<Option<Credentials>>>,
}

impl ApiClient {
    pub fn new(credentials: Arc<RwLock<Option<Credentials>>>) -> Self {
        let http = reqwest::Client::builder()
            .user_agent(concat!("dataforseo-app/", env!("CARGO_PKG_VERSION")))
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("reqwest client should build with default config");
        Self { http, credentials }
    }

    /// Calls the free `/v3/appendix/user_data` endpoint to validate credentials
    /// and read account balance.
    pub async fn user_data(&self) -> Result<serde_json::Value> {
        let creds = self
            .credentials
            .read()
            .await
            .clone()
            .ok_or_else(|| AppError::Auth("credentials not set".into()))?;

        let resp = self
            .http
            .get(format!("{BASE_URL}/v3/appendix/user_data"))
            .basic_auth(&creds.login, Some(&creds.password))
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Api {
                status_code: status.as_u16() as u32,
                message: body,
            });
        }
        Ok(resp.json().await?)
    }
}
