//! DataForSEO Domain Analytics API. Two cheap, one-request endpoints:
//!
//! - `whois/overview`: registrar, expiry, name servers, etc. for a list
//!   of domains. The "list" can be a single name; pricing is 0.0001 USD
//!   per row returned, so a one-domain lookup costs essentially nothing.
//! - `technologies/domain_technologies`: tech stack per domain (CMS,
//!   analytics, ad networks, frameworks). Wappalyzer-style data,
//!   0.001 USD flat per request.

use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::{AppError, Result};
use crate::ratelimit::Family;

#[derive(Debug)]
pub struct WhoisOverviewResponse {
    /// Raw items array preserved verbatim — DataForSEO returns a generous
    /// set of fields (registrar, name servers, dates, status flags) and
    /// we let the UI render the ones it knows about.
    pub items: Value,
    pub items_count: i64,
    pub total_count: i64,
    pub cost: f64,
}

#[derive(Debug)]
pub struct TechnologiesResponse {
    /// Single result row with `technologies` map and metadata.
    pub result: Value,
    pub cost: f64,
}

impl ApiClient {
    /// WHOIS overview for one domain. The endpoint accepts a `targets`
    /// array, but the UI calls it with a single domain at a time —
    /// batching is a future feature. Order_by sorts by domain by default.
    pub async fn whois_overview_live(&self, domain: &str) -> Result<WhoisOverviewResponse> {
        let body = serde_json::json!([{
            "targets": [domain],
            "limit": 1,
        }]);
        let raw = self
            .post_json(
                Family::DomainAnalytics,
                "/v3/domain_analytics/whois/overview/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0").ok_or_else(|| {
            AppError::Parse("whois overview missing tasks[0].result[0]".into())
        })?;
        let items_count = result
            .pointer("/items_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let total_count = result
            .pointer("/total_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let items = result
            .pointer("/items")
            .cloned()
            .unwrap_or(Value::Array(Vec::new()));
        Ok(WhoisOverviewResponse {
            items,
            items_count,
            total_count,
            cost,
        })
    }

    /// Technology stack detected on the given domain. Single-target
    /// endpoint, returns a `technologies` map keyed by category.
    pub async fn domain_technologies_live(&self, domain: &str) -> Result<TechnologiesResponse> {
        let body = serde_json::json!([{
            "target": domain,
        }]);
        let raw = self
            .post_json(
                Family::DomainAnalytics,
                "/v3/domain_analytics/technologies/domain_technologies/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw
            .pointer("/tasks/0/result/0")
            .cloned()
            .ok_or_else(|| {
                AppError::Parse("domain_technologies missing tasks[0].result[0]".into())
            })?;
        Ok(TechnologiesResponse { result, cost })
    }
}
