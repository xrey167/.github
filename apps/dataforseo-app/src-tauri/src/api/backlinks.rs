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

/// Attach a Filter to a payload's `filters` field, wrapping a leaf condition
/// in the outer array DataForSEO expects and skipping the field entirely if
/// the wire form would be empty (an empty Group). Shared by the four
/// /backlinks/* endpoints that take filters: detail, referring_domains,
/// anchors, and pages.
///
/// A leaf condition's wire form starts with the field name (string); a
/// Group's wire form starts with another array. That's the most reliable
/// way to tell them apart without re-walking the tree.
fn attach_filter(payload: &mut serde_json::Value, filter: &Filter) {
    let wire = filter.to_wire();
    let is_leaf = wire
        .as_array()
        .and_then(|a| a.first())
        .map(|v| v.is_string())
        .unwrap_or(false);
    let filters = if is_leaf {
        serde_json::json!([wire])
    } else {
        wire
    };
    if filters.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
        payload["filters"] = filters;
    }
}

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
            attach_filter(&mut payload, filter);
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

// ---------- Referring Domains, Anchors, History ----------

/// Inputs for the three "list" endpoints that share the target/limit/offset/
/// filter shape: referring_domains, anchors. They differ only in fields a
/// filter can target. We keep them in one struct because the wire payload
/// is identical apart from the URL.
#[derive(Debug, Clone)]
pub struct BacklinksListArgs<'a> {
    pub target: &'a str,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    pub filter: Option<&'a Filter>,
    pub order_by: Option<Vec<String>>,
}

#[derive(Debug)]
pub struct BacklinksListResponse {
    pub target: String,
    pub total_count: i64,
    pub items_count: i64,
    pub items: Value,
    pub cost: f64,
}

impl ApiClient {
    /// Referring domains for a target. One row per domain, with backlink
    /// count, dofollow / nofollow split, first-/last-seen timestamps, and
    /// rank metrics. Same filter DSL as detail.
    pub async fn backlinks_referring_domains_live(
        &self,
        args: BacklinksListArgs<'_>,
    ) -> Result<BacklinksListResponse> {
        self.backlinks_list_call(
            "/v3/backlinks/referring_domains/live",
            "referring domains",
            args,
        )
        .await
    }

    /// Anchor texts used by inbound links for a target. One row per anchor
    /// with backlinks/referring_domains counters and a first-/last-seen
    /// pair. Filterable by anchor text or any of the counters.
    pub async fn backlinks_anchors_live(
        &self,
        args: BacklinksListArgs<'_>,
    ) -> Result<BacklinksListResponse> {
        self.backlinks_list_call("/v3/backlinks/anchors/live", "anchors", args)
            .await
    }

    async fn backlinks_list_call(
        &self,
        path: &str,
        endpoint_label: &str,
        args: BacklinksListArgs<'_>,
    ) -> Result<BacklinksListResponse> {
        let mut payload = serde_json::json!({
            "target": args.target,
            "limit": args.limit,
            "offset": args.offset,
            "include_subdomains": args.include_subdomains,
        });
        if let Some(filter) = args.filter {
            attach_filter(&mut payload, filter);
        }
        if let Some(order) = args.order_by {
            payload["order_by"] = serde_json::json!(order);
        }
        let body = serde_json::json!([payload]);
        let raw = self.post_json(Family::Backlinks, path, &body).await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0").ok_or_else(|| {
            AppError::Parse(format!(
                "{endpoint_label} missing tasks[0].result[0]"
            ))
        })?;
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
        Ok(BacklinksListResponse {
            target: args.target.to_string(),
            total_count,
            items_count,
            items,
            cost,
        })
    }

    /// Time-series history of backlink/referring-domain counts. Returns one
    /// row per snapshot, monthly granularity by default, going back up to 5
    /// years (DataForSEO caps how far back data exists per target).
    pub async fn backlinks_history_live(
        &self,
        target: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> Result<BacklinksListResponse> {
        let mut payload = serde_json::json!({ "target": target });
        if let Some(d) = date_from {
            payload["date_from"] = serde_json::json!(d);
        }
        if let Some(d) = date_to {
            payload["date_to"] = serde_json::json!(d);
        }
        let body = serde_json::json!([payload]);
        let raw = self
            .post_json(Family::Backlinks, "/v3/backlinks/history/live", &body)
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0").ok_or_else(|| {
            AppError::Parse("backlinks history missing tasks[0].result[0]".into())
        })?;
        let items_count = result
            .pointer("/items_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let items = result
            .pointer("/items")
            .cloned()
            .unwrap_or(Value::Array(Vec::new()));
        // History has no total_count; fold items_count into both for the
        // shared response shape.
        Ok(BacklinksListResponse {
            target: target.to_string(),
            total_count: items_count,
            items_count,
            items,
            cost,
        })
    }

    /// Domain Intersection — the SEMrush "Link Gap" feature. Pass two
    /// targets and `intersection_mode = "intersect"` to get domains that
    /// link to both, or `"exclude"` to get domains that link only to the
    /// first target. The shape is the same as referring_domains: one row
    /// per linking domain with rank, backlink count, etc.
    pub async fn backlinks_domain_intersection_live(
        &self,
        args: BacklinksIntersectionArgs<'_>,
    ) -> Result<BacklinksListResponse> {
        let mut payload = serde_json::json!({
            "targets": [
                { "target": args.target_a, "include_subdomains": args.include_subdomains },
                { "target": args.target_b, "include_subdomains": args.include_subdomains },
            ],
            "intersection_mode": args.intersection_mode,
            "limit": args.limit,
            "offset": args.offset,
        });
        if let Some(filter) = args.filter {
            attach_filter(&mut payload, filter);
        }
        if let Some(order) = args.order_by {
            payload["order_by"] = serde_json::json!(order);
        }
        let body = serde_json::json!([payload]);
        let raw = self
            .post_json(
                Family::Backlinks,
                "/v3/backlinks/domain_intersection/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0").ok_or_else(|| {
            AppError::Parse("backlinks domain_intersection missing tasks[0].result[0]".into())
        })?;
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
        Ok(BacklinksListResponse {
            // Combine the two targets into the response label so the UI
            // can show "a vs b" without storing them separately.
            target: format!("{} vs {}", args.target_a, args.target_b),
            total_count,
            items_count,
            items,
            cost,
        })
    }
}

/// Inputs for `backlinks_domain_intersection_live`. Two targets and a mode
/// — "intersect" (linking domains in common) or "exclude" (domains linking
/// to A but not B). Filterable like the other list endpoints.
#[derive(Debug, Clone)]
pub struct BacklinksIntersectionArgs<'a> {
    pub target_a: &'a str,
    pub target_b: &'a str,
    /// "intersect" | "exclude" — DataForSEO's wire form.
    pub intersection_mode: &'static str,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    pub filter: Option<&'a Filter>,
    pub order_by: Option<Vec<String>>,
}
