pub mod app_data;
pub mod backlinks;
pub mod client;
pub mod content_analysis;
pub mod domain_analytics;
pub mod keywords_data;
pub mod labs;
pub mod on_page;
pub mod serp;

use crate::errors::{AppError, Result};

/// DataForSEO returns logical errors (invalid params, insufficient balance,
/// account suspended) inside the JSON body even when the HTTP status is 200.
/// This helper checks the top-level status_code (20000 = success) and
/// returns the response cost in one call.
pub(crate) fn ensure_api_success(raw: &serde_json::Value) -> Result<f64> {
    let api_status = raw
        .pointer("/status_code")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    if api_status != 20000 {
        let message = raw
            .pointer("/status_message")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown DataForSEO error");
        return Err(AppError::Api {
            status_code: api_status as u32,
            message: message.into(),
        });
    }
    Ok(raw.pointer("/cost").and_then(|v| v.as_f64()).unwrap_or(0.0))
}
