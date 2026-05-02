//! On-Page API — single-page audits without spinning up a full crawl.
//!
//! - `instant_pages_live`: Wappalyzer-style page audit. Returns ~70
//!   on-page checks (meta tags, headings, content stats, performance
//!   timings, broken resources). 0.0025 USD per page.
//! - `lighthouse_live_json`: Google Lighthouse run. Returns the full
//!   audit JSON with category scores (performance, accessibility,
//!   best-practices, SEO, PWA). 0.0025 USD per request.
//!
//! Both are deeply nested; we surface the raw `result` and let the UI
//! pick the fields it knows about.

use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::{AppError, Result};
use crate::ratelimit::Family;

#[derive(Debug)]
pub struct OnPageInstantResponse {
    pub url: String,
    /// Raw items array — typically a single row for one URL, but the API
    /// is structured to allow batches so we pass the array through.
    pub items: Value,
    pub cost: f64,
}

#[derive(Debug)]
pub struct LighthouseResponse {
    pub url: String,
    /// Full Lighthouse JSON: categories, audits, configSettings, etc.
    pub result: Value,
    pub cost: f64,
}

impl ApiClient {
    pub async fn on_page_instant_pages_live(
        &self,
        url: &str,
        enable_javascript: bool,
        enable_browser_rendering: bool,
    ) -> Result<OnPageInstantResponse> {
        let body = serde_json::json!([{
            "url": url,
            "enable_javascript": enable_javascript,
            "enable_browser_rendering": enable_browser_rendering,
            // load_resources covers CSS/JS so the timing + broken-resource
            // checks come back populated.
            "load_resources": true,
        }]);
        let raw = self
            .post_json(Family::OnPage, "/v3/on_page/instant_pages", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;
        // tasks[0].result[0].items[]; the first row is the page audit.
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .cloned()
            .map(Value::Array)
            .unwrap_or_else(|| Value::Array(Vec::new()));
        Ok(OnPageInstantResponse {
            url: url.to_owned(),
            items,
            cost,
        })
    }

    pub async fn on_page_lighthouse_live_json(
        &self,
        url: &str,
        for_mobile: bool,
    ) -> Result<LighthouseResponse> {
        let body = serde_json::json!([{
            "url": url,
            // DataForSEO accepts "mobile" or "desktop" as the form_factor
            // shorthand. The mobile run is the one Google reports against.
            "for_mobile": for_mobile,
        }]);
        let raw = self
            .post_json(Family::OnPage, "/v3/on_page/lighthouse/live/json", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw
            .pointer("/tasks/0/result/0")
            .cloned()
            .ok_or_else(|| {
                AppError::Parse("lighthouse response missing tasks[0].result[0]".into())
            })?;
        Ok(LighthouseResponse {
            url: url.to_owned(),
            result,
            cost,
        })
    }
}
