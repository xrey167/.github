//! DataForSEO Backlinks API. Phase 2 surface starts with the cheap
//! `summary/live` endpoint — returns dashboard-ready aggregates per target
//! domain (total backlinks, referring domains, dofollow split, TLD/anchor
//! distributions) for a single 0.02 USD request.
//!
//! `backlinks_live` (the per-link detail endpoint) is the next step up: same
//! shape as Ahrefs / SEMrush "Backlinks" table — one row per link, with
//! anchor, source URL, target URL, dofollow flag, and rank metrics. The
//! optional `Filter` argument is the recursive DSL from `domain::filters`,
//! so the UI can compose the typical "dofollow only", "lost links",
//! "rank > 30 AND anchor like %seo%" presets without bespoke serializer
//! code.

use serde::Deserialize;
use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::domain::filters::Filter;
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

    /// Per-link detail. `mode` is one of "as_is" / "one_per_domain" /
    /// "one_per_anchor" — DataForSEO's deduplication knob. `limit` is
    /// capped at 1000 per request by the API; the caller is responsible
    /// for pagination if it wants more.
    pub async fn backlinks_live(
        &self,
        args: BacklinksDetailArgs<'_>,
    ) -> Result<BacklinksDetailResponse> {
        let mut payload = serde_json::json!({
            "target": args.target,
            "mode": args.mode,
            "limit": args.limit,
            "offset": args.offset,
            "include_subdomains": args.include_subdomains,
            "backlinks_status_type": args.backlinks_status_type,
        });
        if let Some(filter) = args.filter {
            // DataForSEO's /backlinks/live takes the filter as an array,
            // even for a single condition. The DSL's `to_wire()` returns
            // a 3-elem array for a Condition leaf, so wrap that case so
            // the API sees `[[field, op, value]]`.
            let wire = filter.to_wire();
            let filters = if wire
                .as_array()
                .and_then(|a| a.first())
                .map(|v| !v.is_array())
                .unwrap_or(true)
            {
                serde_json::json!([wire])
            } else {
                wire
            };
            payload["filters"] = filters;
        }
        if let Some(order) = args.order_by {
            payload["order_by"] = serde_json::json!(order);
        }

        let body = serde_json::json!([payload]);
        let raw = self
            .post_json(Family::Backlinks, "/v3/backlinks/backlinks/live", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;

        let result = raw
            .pointer("/tasks/0/result/0")
            .ok_or_else(|| AppError::Parse("backlinks detail missing tasks[0].result[0]".into()))?;

        let total_count = result
            .pointer("/total_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let items_count = result
            .pointer("/items_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let items = result
            .pointer("/items")
            .cloned()
            .unwrap_or(Value::Array(Vec::new()));

        Ok(BacklinksDetailResponse {
            target: args.target.to_string(),
            total_count,
            items_count,
            items,
            cost,
        })
    }
}

/// Inputs for `backlinks_live`. Only `target` is required; the rest mirror
/// the DataForSEO defaults so callers can pass `Default::default()` and
/// adjust just the fields they care about.
#[derive(Debug, Clone)]
pub struct BacklinksDetailArgs<'a> {
    pub target: &'a str,
    pub mode: &'static str,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    /// "all" | "live" | "lost". Mirrors DataForSEO's `backlinks_status_type`.
    pub backlinks_status_type: &'static str,
    pub filter: Option<&'a Filter>,
    /// e.g. ["domain_from_rank,desc"] — DataForSEO accepts an array of
    /// "field,direction" strings.
    pub order_by: Option<Vec<String>>,
}

#[derive(Debug)]
pub struct BacklinksDetailResponse {
    pub target: String,
    pub total_count: i64,
    pub items_count: i64,
    /// Raw items array preserved verbatim — the UI renders columns it
    /// recognises and lets the user expand the rest.
    pub items: Value,
    pub cost: f64,
}
