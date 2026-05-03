//! App Data API — Google Play + App Store searches and reviews.
//!
//! Mirror of the SERP family but for mobile app stores. Useful for
//! competitive research on app keywords (ASO) and review monitoring.
//!
//! Pricing: 0.002 USD per request (live). All four endpoints share the
//! same shape (items array with rank/title/url/etc. for searches,
//! review-text/rating/author for reviews) so we surface raw Value items
//! and let the UI extract per-store-known fields.

use serde_json::Value;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
use crate::errors::Result;
use crate::ratelimit::Family;

#[derive(Debug)]
pub struct AppDataResponse {
    pub items: Value,
    pub items_count: i64,
    pub total_count: i64,
    pub cost: f64,
}

impl ApiClient {
    pub async fn app_data_google_play_app_searches_live(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<AppDataResponse> {
        self.app_data_post(
            "/v3/app_data/google/app_searches/live/advanced",
            keyword,
            location_code,
            language_code,
            limit,
        )
        .await
    }

    pub async fn app_data_apple_app_searches_live(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<AppDataResponse> {
        self.app_data_post(
            "/v3/app_data/apple/app_searches/live/advanced",
            keyword,
            location_code,
            language_code,
            limit,
        )
        .await
    }

    /// App reviews: pass an app_id (Google Play package or Apple App Store
    /// numeric id) instead of a keyword.
    pub async fn app_data_google_play_app_reviews_live(
        &self,
        app_id: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<AppDataResponse> {
        self.app_data_reviews(
            "/v3/app_data/google/app_reviews/live/advanced",
            app_id,
            location_code,
            language_code,
            limit,
        )
        .await
    }

    pub async fn app_data_apple_app_reviews_live(
        &self,
        app_id: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<AppDataResponse> {
        self.app_data_reviews(
            "/v3/app_data/apple/app_reviews/live/advanced",
            app_id,
            location_code,
            language_code,
            limit,
        )
        .await
    }

    async fn app_data_post(
        &self,
        path: &str,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<AppDataResponse> {
        let body = serde_json::json!([{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "depth": limit.clamp(10, 100),
        }]);
        self.app_data_call(path, &body).await
    }

    async fn app_data_reviews(
        &self,
        path: &str,
        app_id: &str,
        location_code: u32,
        language_code: &str,
        limit: u32,
    ) -> Result<AppDataResponse> {
        let body = serde_json::json!([{
            "app_id": app_id,
            "location_code": location_code,
            "language_code": language_code,
            "depth": limit.clamp(10, 100),
            "sort_by": "newest",
        }]);
        self.app_data_call(path, &body).await
    }

    async fn app_data_call(
        &self,
        path: &str,
        body: &serde_json::Value,
    ) -> Result<AppDataResponse> {
        let raw = self.post_json(Family::AppData, path, body).await?;
        let cost = ensure_api_success(&raw)?;
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
            .and_then(|v| v.as_array())
            .cloned()
            .map(serde_json::Value::Array)
            .unwrap_or_else(|| serde_json::Value::Array(Vec::new()));
        Ok(AppDataResponse {
            items,
            items_count,
            total_count,
            cost,
        })
    }
}
