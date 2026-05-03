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
use crate::errors::Result;
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
        // A successful response with an unregistered or privacy-shielded
        // target returns `result: null` or an empty result array — that's
        // valid data, not a parse error. Fall through with empty
        // counts/items so the UI can render its empty-state message.
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
        // Domains DataForSEO has no tech-stack data on (unregistered,
        // tiny sites, robots.txt-blocked) come back as a successful
        // response with `result: null`. That's not a parse error — we
        // pass Null through and let the UI show its "no technologies
        // detected" state.
        let result = raw
            .pointer("/tasks/0/result/0")
            .cloned()
            .unwrap_or(Value::Null);
        Ok(TechnologiesResponse { result, cost })
    }
}

// ---------- Phase A: Domains by Technology / Aggregation ----------

impl ApiClient {
    /// Domains by Technology — reverse lookup ("who else uses Stripe?").
    pub async fn domain_analytics_domains_by_technology_live(
        &self,
        technologies: &[String],
        limit: u32,
    ) -> Result<Value> {
        let body = serde_json::json!([{
            "technologies": technologies,
            "limit": limit.clamp(1, 1000),
        }]);
        let raw = self
            .post_json(
                Family::DomainAnalytics,
                "/v3/domain_analytics/technologies/domains_by_technology/live",
                &body,
            )
            .await?;
        ensure_api_success(&raw)?;
        Ok(raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .cloned()
            .map(Value::Array)
            .unwrap_or_else(|| Value::Array(Vec::new())))
    }

    /// Aggregation Technologies — distribution of techs across a list of
    /// domains. Used to answer "what tech stack does this competitor set use?"
    pub async fn domain_analytics_aggregation_technologies_live(
        &self,
        targets: &[String],
    ) -> Result<Value> {
        let body = serde_json::json!([{ "targets": targets }]);
        let raw = self
            .post_json(
                Family::DomainAnalytics,
                "/v3/domain_analytics/technologies/aggregation_technologies/live",
                &body,
            )
            .await?;
        ensure_api_success(&raw)?;
        Ok(raw
            .pointer("/tasks/0/result/0")
            .cloned()
            .unwrap_or(Value::Null))
    }
}
