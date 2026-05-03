use std::sync::Arc;
use tokio::sync::RwLock;

use crate::errors::{AppError, Result};
use crate::ratelimit::{Family, Scheduler};
use crate::secrets::Credentials;

const BASE_URL: &str = "https://api.dataforseo.com";

pub struct ApiClient {
    http: reqwest::Client,
    credentials: Arc<RwLock<Option<Credentials>>>,
    scheduler: Arc<Scheduler>,
}

impl ApiClient {
    pub fn new(credentials: Arc<RwLock<Option<Credentials>>>, scheduler: Arc<Scheduler>) -> Self {
        let http = reqwest::Client::builder()
            .user_agent(concat!("dataforseo-app/", env!("CARGO_PKG_VERSION")))
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("reqwest client should build with default config");
        Self { http, credentials, scheduler }
    }

    async fn credentials(&self) -> Result<Credentials> {
        self.credentials
            .read()
            .await
            .clone()
            .ok_or_else(|| AppError::Auth("credentials not set".into()))
    }

    /// Calls the free /v3/appendix/user_data endpoint.
    pub async fn user_data(&self) -> Result<serde_json::Value> {
        let creds = self.credentials().await?;
        let resp = self
            .http
            .get(format!("{BASE_URL}/v3/appendix/user_data"))
            .basic_auth(&creds.login, Some(&creds.password))
            .send()
            .await?;
        Self::deserialize_or_err(resp).await
    }

    /// Free /v3/appendix/status — returns DataForSEO service health for
    /// each endpoint family. Powers the Settings › Service status panel.
    pub async fn appendix_status(&self) -> Result<serde_json::Value> {
        let creds = self.credentials().await?;
        let resp = self
            .http
            .get(format!("{BASE_URL}/v3/appendix/status"))
            .basic_auth(&creds.login, Some(&creds.password))
            .send()
            .await?;
        Self::deserialize_or_err(resp).await
    }

    /// Free /v3/appendix/errors — recent error occurrences for the
    /// account. Useful for debugging when our local ledger doesn't have
    /// the response status code.
    pub async fn appendix_errors(&self) -> Result<serde_json::Value> {
        let creds = self.credentials().await?;
        let resp = self
            .http
            .get(format!("{BASE_URL}/v3/appendix/errors"))
            .basic_auth(&creds.login, Some(&creds.password))
            .send()
            .await?;
        Self::deserialize_or_err(resp).await
    }

    /// POST a JSON body and return the parsed response, gated by the rate
    /// limiter for the given family.
    pub(crate) async fn post_json(
        &self,
        family: Family,
        path: &str,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value> {
        self.scheduler.acquire(family).await;
        let creds = self.credentials().await?;
        let resp = self
            .http
            .post(format!("{BASE_URL}{path}"))
            .basic_auth(&creds.login, Some(&creds.password))
            .json(body)
            .send()
            .await?;
        Self::deserialize_or_err(resp).await
    }

    /// GET a path and return the parsed response, gated by the rate limiter
    /// for the given family. Used by tasks_ready / task_get.
    pub(crate) async fn get_json(
        &self,
        family: Family,
        path: &str,
    ) -> Result<serde_json::Value> {
        self.scheduler.acquire(family).await;
        let creds = self.credentials().await?;
        let resp = self
            .http
            .get(format!("{BASE_URL}{path}"))
            .basic_auth(&creds.login, Some(&creds.password))
            .send()
            .await?;
        Self::deserialize_or_err(resp).await
    }

    async fn deserialize_or_err(resp: reqwest::Response) -> Result<serde_json::Value> {
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Api { status_code: status.as_u16() as u32, message: body });
        }
        Ok(resp.json().await?)
    }
}
