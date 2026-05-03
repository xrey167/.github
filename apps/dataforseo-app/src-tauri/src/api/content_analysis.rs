//! Content Analysis API — Brand Monitoring.
//!
//! Three live endpoints:
//! - `search/live`: find mentions of a keyword across the open web.
//!   Per-row priced (0.001 USD/row) so the caller controls limit.
//! - `summary/live`: aggregate counts (total mentions, sentiment
//!   breakdown, top categories). Flat 0.001 USD per call.
//! - `sentiment_analysis/live`: per-mention sentiment scoring at
//!   0.0005 USD/row. Useful for drilling into a search result set.
//!
//! Responses are deeply nested; we surface the raw items + result blob
//! and let the UI extract well-known fields.

use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::Result;
use crate::ratelimit::Family;

#[derive(Debug)]
pub struct ContentSearchResponse {
    pub items: Value,
    pub items_count: i64,
    pub total_count: i64,
    pub cost: f64,
}

#[derive(Debug)]
pub struct ContentSummaryResponse {
    pub result: Value,
    pub cost: f64,
}

#[derive(Debug)]
pub struct ContentSentimentResponse {
    pub items: Value,
    pub cost: f64,
}

impl ApiClient {
    /// Find mentions matching a search query across the open-web index.
    /// `positive_keywords` / `negative_keywords` narrow the result set.
    pub async fn content_analysis_search_live(
        &self,
        keyword: &str,
        limit: u32,
        positive_keywords: &[String],
        negative_keywords: &[String],
    ) -> Result<ContentSearchResponse> {
        let mut payload = serde_json::json!({
            "keyword": keyword,
            "limit": limit.clamp(1, 1000),
            "page_type": ["news", "blogs", "ecommerce_and_business", "message-board"],
        });
        if !positive_keywords.is_empty() {
            payload["positive_keywords"] = serde_json::json!(positive_keywords);
        }
        if !negative_keywords.is_empty() {
            payload["negative_keywords"] = serde_json::json!(negative_keywords);
        }
        let body = serde_json::json!([payload]);
        let raw = self
            .post_json(Family::ContentAnalysis, "/v3/content_analysis/search/live", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0");
        let items_count = result
            .and_then(|r| r.pointer("/items_count"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let total_count = result
            .and_then(|r| r.pointer("/total_count"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let items = result
            .and_then(|r| r.pointer("/items"))
            .and_then(|v| v.as_array())
            .cloned()
            .map(Value::Array)
            .unwrap_or_else(|| Value::Array(Vec::new()));
        Ok(ContentSearchResponse { items, items_count, total_count, cost })
    }

    /// Aggregate stats for a keyword — total mentions, sentiment split,
    /// top categories. Used for the brand-overview tile.
    pub async fn content_analysis_summary_live(
        &self,
        keyword: &str,
        positive_keywords: &[String],
        negative_keywords: &[String],
    ) -> Result<ContentSummaryResponse> {
        let mut payload = serde_json::json!({
            "keyword": keyword,
            "page_type": ["news", "blogs", "ecommerce_and_business", "message-board"],
        });
        if !positive_keywords.is_empty() {
            payload["positive_keywords"] = serde_json::json!(positive_keywords);
        }
        if !negative_keywords.is_empty() {
            payload["negative_keywords"] = serde_json::json!(negative_keywords);
        }
        let body = serde_json::json!([payload]);
        let raw = self
            .post_json(Family::ContentAnalysis, "/v3/content_analysis/summary/live", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw
            .pointer("/tasks/0/result/0")
            .cloned()
            .unwrap_or(Value::Null);
        Ok(ContentSummaryResponse { result, cost })
    }

    /// Per-mention sentiment scoring. 0.0005 USD/row.
    pub async fn content_analysis_sentiment_live(
        &self,
        keyword: &str,
        limit: u32,
    ) -> Result<ContentSentimentResponse> {
        let body = serde_json::json!([{
            "keyword": keyword,
            "limit": limit.clamp(1, 1000),
            "page_type": ["news", "blogs", "ecommerce_and_business", "message-board"],
        }]);
        let raw = self
            .post_json(
                Family::ContentAnalysis,
                "/v3/content_analysis/sentiment_analysis/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .cloned()
            .map(Value::Array)
            .unwrap_or_else(|| Value::Array(Vec::new()));
        Ok(ContentSentimentResponse { items, cost })
    }
}
