//! SERP API — Google Organic.
//!
//! Tier 1 covers the Live "regular" variant (cheapest, returns the basic
//! item types). The "advanced" variant and the standard-queue task flow
//! land in later milestones.

use serde::Deserialize;

use crate::api::client::ApiClient;
use crate::errors::{AppError, Result};
use crate::ratelimit::Family;

#[derive(Debug, Deserialize)]
pub struct SerpItem {
    /// "organic", "featured_snippet", "people_also_ask", "paid", etc.
    #[serde(rename = "type")]
    pub kind: String,
    pub rank_absolute: Option<i32>,
    pub url: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub domain: Option<String>,
}

#[derive(Debug)]
pub struct SerpLiveResponse {
    pub keyword: String,
    pub items: Vec<SerpItem>,
    pub cost: f64,
}

impl ApiClient {
    pub async fn serp_google_organic_live(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        depth: u32,
    ) -> Result<SerpLiveResponse> {
        let body = serde_json::json!([{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "depth": depth.clamp(10, 100),
        }]);
        let raw = self
            .post_json(
                Family::SerpLive,
                "/v3/serp/google/organic/live/regular",
                &body,
            )
            .await?;

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

        let result = raw
            .pointer("/tasks/0/result/0")
            .ok_or_else(|| {
                AppError::Parse("serp response missing tasks[0].result[0]".into())
            })?;

        let keyword_out = result
            .pointer("/keyword")
            .and_then(|v| v.as_str())
            .unwrap_or(keyword)
            .to_owned();

        let items = result
            .pointer("/items")
            .and_then(|v| v.as_array())
            .ok_or_else(|| AppError::Parse("serp response missing items array".into()))?
            .iter()
            .filter_map(|raw| serde_json::from_value::<SerpItem>(raw.clone()).ok())
            .collect();

        Ok(SerpLiveResponse {
            keyword: keyword_out,
            items,
            cost,
        })
    }
}
