use serde::{Deserialize, Serialize};

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::{AppError, Result};
use crate::ratelimit::Family;

#[derive(Debug, Serialize)]
pub struct SearchVolumeRequest<'a> {
    pub keywords: &'a [String],
    pub location_code: u32,
    pub language_code: &'a str,
}

#[derive(Debug, Deserialize)]
pub struct SearchVolumeResponse {
    pub items: Vec<SearchVolumeItem>,
    pub cost: f64,
}

#[derive(Debug, Deserialize)]
pub struct SearchVolumeItem {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub competition_index: Option<i32>,
    pub cpc: Option<f64>,
    pub low_top_of_page_bid: Option<f64>,
    pub high_top_of_page_bid: Option<f64>,
    pub monthly_searches: Option<serde_json::Value>,
}

impl ApiClient {
    /// POST /v3/keywords_data/google_ads/search_volume/live
    pub async fn google_ads_search_volume_live(
        &self,
        req: SearchVolumeRequest<'_>,
    ) -> Result<SearchVolumeResponse> {
        if req.keywords.is_empty() {
            return Ok(SearchVolumeResponse { items: Vec::new(), cost: 0.0 });
        }
        if req.keywords.len() > 1000 {
            return Err(AppError::Validation(
                "search_volume accepts at most 1000 keywords per request".into(),
            ));
        }

        // DataForSEO expects an array containing one task definition.
        let body = serde_json::json!([{
            "keywords": req.keywords,
            "location_code": req.location_code,
            "language_code": req.language_code,
        }]);

        let raw = self
            .post_json(
                Family::GoogleAdsLive,
                "/v3/keywords_data/google_ads/search_volume/live",
                &body,
            )
            .await?;

        let cost = ensure_api_success(&raw)?;

        let items = raw
            .pointer("/tasks/0/result")
            .and_then(|v| v.as_array())
            .ok_or_else(|| {
                AppError::Parse("search_volume response missing tasks[0].result".into())
            })?
            .iter()
            .filter_map(|item| serde_json::from_value::<SearchVolumeItem>(item.clone()).ok())
            .collect();

        Ok(SearchVolumeResponse { items, cost })
    }
}

// ---------- Google Trends Explore ----------
//
// Interest-over-time for up to 5 keywords. Response carries items of
// type "google_trends_graph" with a `data` array of (timestamp, values
// per keyword). We pass the raw items through; the UI charts the
// graph item and shows "topics" / "queries" lists if present.

#[derive(Debug)]
pub struct TrendsResponse {
    pub items: serde_json::Value,
    pub cost: f64,
}

impl ApiClient {
    pub async fn google_trends_explore_live(
        &self,
        keywords: &[String],
        location_code: u32,
        language_code: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> Result<TrendsResponse> {
        let mut payload = serde_json::json!({
            "keywords": keywords,
            "location_code": location_code,
            "language_code": language_code,
            "type": "web",
        });
        if let Some(from) = date_from {
            payload["date_from"] = serde_json::Value::String(from.to_owned());
        }
        if let Some(to) = date_to {
            payload["date_to"] = serde_json::Value::String(to.to_owned());
        }
        let body = serde_json::json!([payload]);
        let raw = self
            .post_json(
                Family::KeywordsData,
                "/v3/keywords_data/google_trends/explore/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items = raw
            .pointer("/tasks/0/result/0/items")
            .and_then(|v| v.as_array())
            .cloned()
            .map(serde_json::Value::Array)
            .unwrap_or_else(|| serde_json::Value::Array(Vec::new()));
        Ok(TrendsResponse { items, cost })
    }
}

// ---------- Google Ads Keywords-for-Site / Keywords-for-Keywords ----------

/// Google Ads keyword expansion endpoints. Both return the same shape
/// (a list of keyword ideas with monthly_searches), so we share the
/// SearchVolumeResponse/Item types from above.

impl ApiClient {
    /// Keywords for a domain target. Charges 0.075 USD per call regardless
    /// of how many keywords come back.
    pub async fn google_ads_keywords_for_site_live(
        &self,
        target: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<SearchVolumeResponse> {
        let body = serde_json::json!([{
            "target": target,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.clamp(1, 1000),
            "sort_by": "search_volume",
        }]);
        let raw = self
            .post_json(
                Family::GoogleAdsLive,
                "/v3/keywords_data/google_ads/keywords_for_site/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items = raw
            .pointer("/tasks/0/result")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|i| serde_json::from_value::<SearchVolumeItem>(i.clone()).ok())
                    .collect()
            })
            .unwrap_or_default();
        Ok(SearchVolumeResponse { items, cost })
    }

    /// Keyword expansion from a seed keyword set.
    pub async fn google_ads_keywords_for_keywords_live(
        &self,
        seeds: &[String],
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<SearchVolumeResponse> {
        let body = serde_json::json!([{
            "keywords": seeds,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit.clamp(1, 1000),
            "sort_by": "search_volume",
        }]);
        let raw = self
            .post_json(
                Family::GoogleAdsLive,
                "/v3/keywords_data/google_ads/keywords_for_keywords/live",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let items = raw
            .pointer("/tasks/0/result")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|i| serde_json::from_value::<SearchVolumeItem>(i.clone()).ok())
                    .collect()
            })
            .unwrap_or_default();
        Ok(SearchVolumeResponse { items, cost })
    }
}
