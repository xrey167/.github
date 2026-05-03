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
pub struct TaskPostResult {
    pub task_id: String,
    pub cost: f64,
}

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

    /// Submit a multi-page crawl. Returns the task_id; the background
    /// audit poller advances it through tasks_ready → summary → pages.
    pub async fn on_page_task_post(
        &self,
        target: &str,
        max_crawl_pages: u32,
    ) -> Result<TaskPostResult> {
        let body = serde_json::json!([{
            "target": target,
            "max_crawl_pages": max_crawl_pages.clamp(1, 1000),
            "load_resources": true,
            "enable_javascript": true,
            "enable_browser_rendering": false,
        }]);
        let raw = self
            .post_json(Family::OnPage, "/v3/on_page/task_post", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;
        let task_id = raw
            .pointer("/tasks/0/id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Parse("task_post response missing tasks[0].id".into()))?
            .to_owned();
        Ok(TaskPostResult { task_id, cost })
    }

    /// Returns the task_ids that have completed and are ready to fetch
    /// /summary and /pages for. Empty list when nothing's ready yet.
    pub async fn on_page_tasks_ready(&self) -> Result<Vec<String>> {
        let raw = self
            .get_json(Family::OnPage, "/v3/on_page/tasks_ready")
            .await?;
        ensure_api_success(&raw)?;
        let ids = raw
            .pointer("/tasks/0/result")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|t| t.pointer("/id").and_then(|v| v.as_str()).map(|s| s.to_owned()))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        Ok(ids)
    }

    /// Crawl summary blob — domain-level metrics, broken-link counts,
    /// duplicate-content totals, etc. UI surfaces the well-known fields.
    pub async fn on_page_summary(&self, task_id: &str) -> Result<serde_json::Value> {
        let path = format!("/v3/on_page/summary/{task_id}");
        let raw = self.get_json(Family::OnPage, &path).await?;
        ensure_api_success(&raw)?;
        let summary = raw
            .pointer("/tasks/0/result/0")
            .cloned()
            .unwrap_or(serde_json::Value::Null);
        Ok(summary)
    }

    /// Per-page audit data. POST not GET because the API takes filters
    /// in the body. Returns the items array verbatim — caller extracts
    /// the well-known fields and stores `raw_json` for drill-down.
    pub async fn on_page_pages(
        &self,
        task_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<serde_json::Value> {
        let body = serde_json::json!([{
            "id": task_id,
            "limit": limit.clamp(1, 1000),
            "offset": offset,
        }]);
        let raw = self
            .post_json(Family::OnPage, "/v3/on_page/pages", &body)
            .await?;
        ensure_api_success(&raw)?;
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .cloned()
            .map(serde_json::Value::Array)
            .unwrap_or_else(|| serde_json::Value::Array(Vec::new()));
        Ok(items)
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
