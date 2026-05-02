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

// ---------- Competitive Intelligence ----------

/// One competitor domain returned by SERP Competitors.
#[derive(Debug, Deserialize)]
pub struct SerpCompetitorItem {
    pub domain: Option<String>,
    pub avg_position: Option<f64>,
    pub median_position: Option<f64>,
    pub rating: Option<f64>,
    pub etv: Option<f64>,
    pub count: Option<i64>,
}

#[derive(Debug)]
pub struct SerpCompetitorsResponse {
    pub keyword: String,
    pub items: Vec<SerpCompetitorItem>,
    pub cost: f64,
}

/// One competing domain returned by Competitors Domain.
#[derive(Debug, Deserialize)]
pub struct CompetitorsDomainItem {
    pub domain: Option<String>,
    pub avg_position: Option<f64>,
    pub sum_position: Option<i64>,
    pub intersections: Option<i64>,
}

#[derive(Debug)]
pub struct CompetitorsDomainResponse {
    pub target: String,
    pub items: Vec<CompetitorsDomainItem>,
    pub cost: f64,
}

/// One keyword in the Domain Intersection result — extracted from the
/// deeply nested `keyword_data / *_domain_serp_element` shape.
#[derive(Debug)]
pub struct DomainIntersectionItem {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub keyword_difficulty: Option<i32>,
    pub rank_first: Option<i32>,
    pub rank_second: Option<i32>,
    pub url_first: Option<String>,
    pub url_second: Option<String>,
}

#[derive(Debug)]
pub struct DomainIntersectionResponse {
    pub target1: String,
    pub target2: String,
    pub items: Vec<DomainIntersectionItem>,
    pub cost: f64,
}

impl ApiClient {
    /// SERP Competitors — which domains appear in SERP results for a keyword,
    /// with position metrics and estimated traffic value.
    pub async fn labs_serp_competitors(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<SerpCompetitorsResponse> {
        let body = serde_json::json!([{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.min(1000),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/serp_competitors/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let raw_items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw_item| {
                        serde_json::from_value::<SerpCompetitorItem>(raw_item.clone()).ok()
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(SerpCompetitorsResponse {
            keyword: keyword.to_owned(),
            items: raw_items,
            cost,
        })
    }

    /// Competitors Domain — which domains share the most keyword overlap
    /// with a target domain, sorted by number of intersecting keywords.
    pub async fn labs_competitors_domain(
        &self,
        target: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<CompetitorsDomainResponse> {
        let body = serde_json::json!([{
            "target": target,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.min(1000),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/competitors_domain/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let raw_items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw_item| {
                        serde_json::from_value::<CompetitorsDomainItem>(raw_item.clone()).ok()
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(CompetitorsDomainResponse {
            target: target.to_owned(),
            items: raw_items,
            cost,
        })
    }

    /// Domain Intersection — keywords that both `target1` and `target2` rank
    /// for in the SERP, with position data for each domain. Useful for
    /// identifying the competitive keyword overlap between two domains.
    pub async fn labs_domain_intersection(
        &self,
        target1: &str,
        target2: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<DomainIntersectionResponse> {
        let body = serde_json::json!([{
            "target1": target1,
            "target2": target2,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.min(1000),
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/domain_intersection/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw_item| {
                        let kd = raw_item.pointer("/keyword_data")?;
                        let keyword = kd.pointer("/keyword").and_then(|v| v.as_str())?.to_owned();
                        let search_volume = kd
                            .pointer("/keyword_info/search_volume")
                            .and_then(|v| v.as_i64());
                        let keyword_difficulty = kd
                            .pointer("/keyword_properties/keyword_difficulty")
                            .and_then(|v| v.as_i64())
                            .map(|n| n as i32);
                        let rank_first = raw_item
                            .pointer("/first_domain_serp_element/serp_item/rank_absolute")
                            .and_then(|v| v.as_i64())
                            .map(|n| n as i32);
                        let rank_second = raw_item
                            .pointer("/second_domain_serp_element/serp_item/rank_absolute")
                            .and_then(|v| v.as_i64())
                            .map(|n| n as i32);
                        let url_first = raw_item
                            .pointer("/first_domain_serp_element/serp_item/url")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_owned());
                        let url_second = raw_item
                            .pointer("/second_domain_serp_element/serp_item/url")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_owned());
                        Some(DomainIntersectionItem {
                            keyword,
                            search_volume,
                            keyword_difficulty,
                            rank_first,
                            rank_second,
                            url_first,
                            url_second,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(DomainIntersectionResponse {
            target1: target1.to_owned(),
            target2: target2.to_owned(),
            items,
            cost,
        })
    }
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

/// Bulk Search Volume — Labs equivalent of Google Ads Search Volume but
/// at 0.0001 USD per keyword (vs 0.075 / 1k Google Ads). Trades some
/// accuracy on long-tail terms for ~750× cost savings on large batches.
#[derive(Debug, Deserialize)]
pub struct BulkSearchVolumeItem {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<f64>,
    pub competition_level: Option<String>,
    pub cpc: Option<f64>,
}

#[derive(Debug)]
pub struct BulkSearchVolumeResponse {
    pub items: Vec<BulkSearchVolumeItem>,
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
        // Going through `.as_array()` first explicitly bottoms out at an
        // empty Vec when the field is missing OR a JSON null; without
        // that step, `Some(&Value::Null).cloned()` short-circuits the
        // unwrap_or and leaks Value::Null into the frontend (which
        // expects an array).
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .cloned()
            .map(serde_json::Value::Array)
            .unwrap_or_else(|| serde_json::Value::Array(Vec::new()));
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

    /// Bulk Search Volume — Labs version. Cheapest per-keyword volume
    /// option in the catalogue (0.0001 USD/kw). Up to 1000 keywords per
    /// request; the caller dedups + caps before invoking.
    pub async fn labs_bulk_search_volume(
        &self,
        keywords: &[String],
        location_code: u32,
        language_code: &str,
    ) -> Result<BulkSearchVolumeResponse> {
        let body = serde_json::json!([{
            "keywords": keywords,
            "location_code": location_code,
            "language_code": language_code,
        }]);
        let raw = self
            .post_json(
                Family::Labs,
                "/v3/dataforseo_labs/google/bulk_search_volume/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items: Vec<BulkSearchVolumeItem> = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw_item| {
                        serde_json::from_value::<BulkSearchVolumeItem>(raw_item.clone()).ok()
                    })
                    .collect()
            })
            .unwrap_or_default();
        Ok(BulkSearchVolumeResponse { items, cost })
    }
}
