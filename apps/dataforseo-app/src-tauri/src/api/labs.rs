//! DataForSEO Labs API — Google endpoints.
//!
//! Suggestions and Related share a near-identical response shape, so they
//! return the same LabsKeywordItem type. Other Labs endpoints (for_site,
//! ranked_keywords) live in their own modules with their own response types.

use serde::Deserialize;

use crate::api::client::ApiClient;
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
}

fn parse_labs_response(raw: &serde_json::Value) -> Result<LabsResponse> {
    let api_status = raw.pointer("/status_code").and_then(|v| v.as_u64()).unwrap_or(0);
    if api_status != 20000 {
        let message = raw
            .pointer("/status_message")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown DataForSEO error");
        return Err(AppError::Api {
            status_code: api_status as u32,
            message: message.into(),
        });
    }

    let cost = raw.pointer("/cost").and_then(|v| v.as_f64()).unwrap_or(0.0);

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
