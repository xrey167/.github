//! DataForSEO Labs API — Google endpoints.
//!
//! Suggestions and Related share a near-identical response shape, so they
//! return the same LabsKeywordItem type. Ranked-keywords carries a SERP
//! element and gets its own type.

use serde::Deserialize;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::{AppError, Result};
use crate::ratelimit::Family;

#[derive(Debug, Deserialize)]
pub struct LabsKeywordItem {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub competition_index: Option<i32>,
    pub cpc: Option<f64>,
    pub keyword_difficulty: Option<i32>,
}

#[derive(Debug)]
pub struct LabsResponse {
    pub items: Vec<LabsKeywordItem>,
    pub cost: f64,
}

impl ApiClient {
    pub async fn labs_keyword_suggestions(
        &self,
        seed: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<LabsResponse> {
        let body = serde_json::json!([{
            "keyword": seed,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.min(1000),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/keyword_suggestions/live",
                &body,
            )
            .await?;
        parse_labs_response(&raw)
    }

    pub async fn labs_related_keywords(
        &self,
        seed: &str,
        location_code: u32,
        language_code: &str,
        depth: u32,
    ) -> Result<LabsResponse> {
        let body = serde_json::json!([{
            "keyword": seed,
            "location_code": location_code,
            "language_code": language_code,
            "depth": depth.clamp(1, 4),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/related_keywords/live",
                &body,
            )
            .await?;
        parse_labs_response(&raw)
    }

    pub async fn labs_keywords_for_site(
        &self,
        target: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<LabsResponse> {
        let body = serde_json::json!([{
            "target": target,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.min(1000),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/keywords_for_site/live",
                &body,
            )
            .await?;
        parse_labs_response(&raw)
    }

    pub async fn labs_ranked_keywords(
        &self,
        target: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<RankedResponse> {
        let body = serde_json::json!([{
            "target": target,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.min(1000),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/ranked_keywords/live",
                &body,
            )
            .await?;
        parse_ranked_response(&raw)
    }
}

#[derive(Debug, Deserialize)]
pub struct RankedKeywordItem {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub cpc: Option<f64>,
    pub keyword_difficulty: Option<i32>,
    pub rank_absolute: Option<i32>,
    pub serp_url: Option<String>,
    pub etv: Option<f64>,
}

#[derive(Debug)]
pub struct RankedResponse {
    pub items: Vec<RankedKeywordItem>,
    pub cost: f64,
}

fn parse_ranked_response(raw: &serde_json::Value) -> Result<RankedResponse> {
    let cost = ensure_api_success(raw)?;

    let raw_items = raw
        .pointer("/tasks/0/result/0/items")
        .and_then(|v| v.as_array())
        .ok_or_else(|| {
            AppError::Parse("ranked_keywords response missing tasks[0].result[0].items".into())
        })?;

    let items = raw_items
        .iter()
        .filter_map(|raw_item| {
            let kd = raw_item.pointer("/keyword_data")?;
            let info = kd.pointer("/keyword_info");
            let keyword = kd.pointer("/keyword").and_then(|v| v.as_str())?.to_owned();
            let serp = raw_item.pointer("/ranked_serp_element/serp_item");
            Some(RankedKeywordItem {
                keyword,
                search_volume: info.and_then(|i| i.pointer("/search_volume")).and_then(|v| v.as_i64()),
                competition: info
                    .and_then(|i| i.pointer("/competition"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_owned()),
                cpc: info.and_then(|i| i.pointer("/cpc")).and_then(|v| v.as_f64()),
                keyword_difficulty: kd
                    .pointer("/keyword_properties/keyword_difficulty")
                    .and_then(|v| v.as_i64())
                    .map(|n| n as i32),
                rank_absolute: serp
                    .and_then(|s| s.pointer("/rank_absolute"))
                    .and_then(|v| v.as_i64())
                    .map(|n| n as i32),
                serp_url: serp
                    .and_then(|s| s.pointer("/url"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_owned()),
                etv: serp.and_then(|s| s.pointer("/etv")).and_then(|v| v.as_f64()),
            })
        })
        .collect();

    Ok(RankedResponse { items, cost })
}

fn parse_labs_response(raw: &serde_json::Value) -> Result<LabsResponse> {
    let cost = ensure_api_success(raw)?;

    // Both endpoints nest the keyword list at tasks[0].result[0].items[].
    // The keyword payload itself sits at .keyword_data.keyword for related,
    // and at the top level for suggestions — flatten via two pointer attempts.
    let raw_items = raw
        .pointer("/tasks/0/result/0/items")
        .and_then(|v| v.as_array())
        .ok_or_else(|| {
            AppError::Parse("labs response missing tasks[0].result[0].items".into())
        })?;

    let items = raw_items
        .iter()
        .filter_map(|raw_item| {
            // For related_keywords each item wraps the actual keyword in
            // .keyword_data; for suggestions the fields are top-level.
            let target = raw_item
                .pointer("/keyword_data/keyword_info")
                .or_else(|| Some(raw_item))?;
            let keyword = target
                .pointer("/keyword")
                .or_else(|| raw_item.pointer("/keyword_data/keyword"))
                .or_else(|| raw_item.pointer("/keyword"))
                .and_then(|v| v.as_str())?
                .to_owned();
            Some(LabsKeywordItem {
                keyword,
                search_volume: target.pointer("/search_volume").and_then(|v| v.as_i64()),
                competition: target
                    .pointer("/competition")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_owned()),
                competition_index: target
                    .pointer("/competition_index")
                    .and_then(|v| v.as_i64())
                    .map(|n| n as i32),
                cpc: target.pointer("/cpc").and_then(|v| v.as_f64()),
                keyword_difficulty: raw_item
                    .pointer("/keyword_properties/keyword_difficulty")
                    .and_then(|v| v.as_i64())
                    .map(|n| n as i32),
            })
        })
        .collect();

    Ok(LabsResponse { items, cost })
}

// ---------- Domain Rank Overview ----------

/// SEMrush-style domain overview: organic traffic, keyword count, rank
/// distribution by SERP position bucket, paid metrics. We pass the raw
/// nested shape through and let the UI extract the well-known fields.
#[derive(Debug)]
pub struct LabsDomainRankOverviewResponse {
    pub items: serde_json::Value,
    pub cost: f64,
}

/// Bulk keyword-difficulty: cheap (0.0001 USD per kw) lookup of the
/// per-keyword difficulty score. Used in the Keywords > Difficulty tab.
#[derive(Debug, Deserialize)]
pub struct BulkDifficultyItem {
    pub keyword: String,
    pub keyword_difficulty: Option<i32>,
}

#[derive(Debug)]
pub struct BulkDifficultyResponse {
    pub items: Vec<BulkDifficultyItem>,
    pub cost: f64,
}

impl ApiClient {
    /// Domain Rank Overview — single target. Returns aggregate
    /// SERP-position metrics for both organic and paid placements.
    pub async fn labs_domain_rank_overview(
        &self,
        target: &str,
        location_code: u32,
        language_code: &str,
    ) -> Result<LabsDomainRankOverviewResponse> {
        let body = serde_json::json!([{
            "target": target,
            "location_code": location_code,
            "language_code": language_code,
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/domain_rank_overview/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        // Like the other Labs endpoints, treat a successful empty result
        // as "no data" rather than a parse error — DataForSEO returns
        // an empty items array for tiny / freshly-registered domains.
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .cloned()
            .unwrap_or(serde_json::Value::Array(Vec::new()));
        Ok(LabsDomainRankOverviewResponse { items, cost })
    }

    /// Bulk Keyword Difficulty for up to 1000 keywords per request.
    /// The frontend caps the input at 1000 so we don't have to fan
    /// out multiple requests under the hood.
    pub async fn labs_bulk_keyword_difficulty(
        &self,
        keywords: &[String],
        location_code: u32,
        language_code: &str,
    ) -> Result<BulkDifficultyResponse> {
        let body = serde_json::json!([{
            "keywords": keywords,
            "location_code": location_code,
            "language_code": language_code,
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/bulk_keyword_difficulty/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items: Vec<BulkDifficultyItem> = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw_item| {
                        let keyword = raw_item.pointer("/keyword").and_then(|v| v.as_str())?.to_owned();
                        let keyword_difficulty = raw_item
                            .pointer("/keyword_difficulty")
                            .and_then(|v| v.as_i64())
                            .map(|n| n as i32);
                        Some(BulkDifficultyItem {
                            keyword,
                            keyword_difficulty,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(BulkDifficultyResponse { items, cost })
    }
}
