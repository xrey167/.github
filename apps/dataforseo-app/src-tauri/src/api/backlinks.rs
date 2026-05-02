//! DataForSEO Backlinks API. Phase 2 surface starts with the cheap
//! `summary/live` endpoint — returns dashboard-ready aggregates per target
//! domain (total backlinks, referring domains, dofollow split, TLD/anchor
//! distributions) for a single 0.02 USD request.

use serde::Deserialize;
use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::{AppError, Result};
use crate::ratelimit::Family;

/// Aggregate backlink-profile metrics for one target. We keep the API's raw
/// nested shape on most fields and just lift the often-asked numbers to the
/// top level — matches what the UI tile renders without parsing.
#[derive(Debug, Deserialize)]
pub struct BacklinksSummary {
    pub target: String,
    pub backlinks: Option<i64>,
    pub referring_domains: Option<i64>,
    pub referring_main_domains: Option<i64>,
    pub referring_pages: Option<i64>,
    pub dofollow_backlinks: Option<i64>,
    pub nofollow_backlinks: Option<i64>,
    pub broken_backlinks: Option<i64>,
    pub broken_pages: Option<i64>,
    pub rank: Option<i32>,
    /// Distribution maps preserved verbatim — too many shape variations to
    /// type out fully, and the UI just renders top-N slices.
    pub referring_domains_nofollow: Option<i64>,
    pub anchor_distribution: Option<Value>,
    pub tld_distribution: Option<Value>,
    pub crawled_pages: Option<i64>,
}

#[derive(Debug)]
pub struct BacklinksSummaryResponse {
    pub summary: BacklinksSummary,
    pub cost: f64,
}

impl ApiClient {
    pub async fn backlinks_summary_live(&self, target: &str) -> Result<BacklinksSummaryResponse> {
        let body = serde_json::json!([{
            "target": target,
            // include_subdomains defaults to true on DataForSEO; we keep
            // it explicit so the tile aligns with the user's expectation.
            "include_subdomains": true,
        }]);
        let raw = self
            .post_json(Family::Backlinks, "/v3/backlinks/summary/live", &body)
            .await?;

        let cost = ensure_api_success(&raw)?;

        let result = raw
            .pointer("/tasks/0/result/0")
            .ok_or_else(|| {
                AppError::Parse("backlinks summary missing tasks[0].result[0]".into())
            })?;

        let summary: BacklinksSummary =
            serde_json::from_value(result.clone()).map_err(|e| AppError::Parse(e.to_string()))?;

        Ok(BacklinksSummaryResponse { summary, cost })
    }
}
