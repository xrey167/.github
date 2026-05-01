use serde::{Deserialize, Serialize};

use crate::api::client::ApiClient;
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

        let cost = raw.pointer("/cost").and_then(|v| v.as_f64()).unwrap_or(0.0);

        let items = raw
            .pointer("/tasks/0/result")
            .and_then(|v| v.as_array())
            .ok_or_else(|| AppError::Api {
                status_code: 200,
                message: "search_volume response missing tasks[0].result".into(),
            })?
            .iter()
            .filter_map(|item| serde_json::from_value::<SearchVolumeItem>(item.clone()).ok())
            .collect();

        Ok(SearchVolumeResponse { items, cost })
    }
}
