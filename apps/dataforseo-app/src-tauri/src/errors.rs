use serde::Serialize;
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Error, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("network error: {0}")]
    Network(String),

    #[error("authentication failed: {0}")]
    Auth(String),

    #[error("rate limit exceeded for {family} (retry in {retry_after_secs}s)")]
    RateLimit { family: String, retry_after_secs: u32 },

    #[error("validation: {0}")]
    Validation(String),

    #[error("database: {0}")]
    Database(String),

    #[error("api error {status_code}: {message}")]
    Api { status_code: u32, message: String },

    /// Response was structurally unexpected even though the upstream API
    /// reported success. Distinct from Api so callers can tell a successful
    /// API call with a malformed body apart from an explicit upstream error.
    #[error("response parse error: {0}")]
    Parse(String),

    #[error("internal: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Network(e.to_string())
    }
}

impl From<duckdb::Error> for AppError {
    fn from(e: duckdb::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self {
        AppError::Auth(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
