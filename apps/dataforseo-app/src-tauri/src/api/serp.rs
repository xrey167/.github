//! SERP API — Google Organic.
//!
//! Live "regular" + the Standard-Queue task flow (task_post / tasks_ready /
//! task_get/regular). The "advanced" variant carries richer SERP features
//! at ~5x cost and is not yet wired up.

use serde::Deserialize;

use crate::api::client::ApiClient;
use crate::api::ensure_api_success;
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

        let cost = ensure_api_success(&raw)?;

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
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw| serde_json::from_value::<SerpItem>(raw.clone()).ok())
                    .collect()
            })
            .unwrap_or_default();

        Ok(SerpLiveResponse {
            keyword: keyword_out,
            items,
            cost,
        })
    }

    /// Submit a batch of SERP tasks to the Standard Queue. Each entry in
    /// `keywords` becomes one task with the same location/language/depth.
    /// Returns the DataForSEO-assigned task_ids in the same order.
    pub async fn serp_google_organic_task_post(
        &self,
        keywords: &[String],
        location_code: u32,
        language_code: &str,
        depth: u32,
    ) -> Result<TaskPostResponse> {
        let entries: Vec<serde_json::Value> = keywords
            .iter()
            .map(|k| {
                serde_json::json!({
                    "keyword": k,
                    "location_code": location_code,
                    "language_code": language_code,
                    "depth": depth.clamp(10, 100),
                })
            })
            .collect();
        let body = serde_json::Value::Array(entries);

        let raw = self
            .post_json(
                Family::SerpTask,
                "/v3/serp/google/organic/task_post",
                &body,
            )
            .await?;

        let cost = ensure_api_success(&raw)?;

        let task_ids = raw
            .pointer("/tasks")
            .and_then(|v| v.as_array())
            .ok_or_else(|| AppError::Parse("task_post response missing tasks array".into()))?
            .iter()
            .filter_map(|t| t.pointer("/id").and_then(|v| v.as_str()).map(|s| s.to_owned()))
            .collect();

        Ok(TaskPostResponse { task_ids, cost })
    }

    /// Returns the task_ids that have completed and are ready to fetch.
    pub async fn serp_google_organic_tasks_ready(&self) -> Result<Vec<String>> {
        let raw = self
            .get_json(Family::SerpTask, "/v3/serp/google/organic/tasks_ready")
            .await?;
        ensure_api_success(&raw)?;

        let ids = raw
            .pointer("/tasks/0/result")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|t| t.pointer("/id").and_then(|v| v.as_str()).map(|s| s.to_owned()))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        Ok(ids)
    }

    /// Fetch the regular result set for a single completed task.
    pub async fn serp_google_organic_task_get_regular(
        &self,
        task_id: &str,
    ) -> Result<SerpLiveResponse> {
        let path = format!("/v3/serp/google/organic/task_get/regular/{task_id}");
        let raw = self.get_json(Family::SerpTask, &path).await?;

        let cost = ensure_api_success(&raw)?;

        let result = raw
            .pointer("/tasks/0/result/0")
            .ok_or_else(|| AppError::Parse("task_get response missing tasks[0].result[0]".into()))?;

        let keyword_out = result
            .pointer("/keyword")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_owned();

        let items = result
            .pointer("/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw| serde_json::from_value::<SerpItem>(raw.clone()).ok())
                    .collect()
            })
            .unwrap_or_default();

        Ok(SerpLiveResponse { keyword: keyword_out, items, cost })
    }
}

/// Google Maps SERP item. Different shape from organic/ads/news — carries
/// place metadata (address, phone, rating) rather than a web page snippet.
#[derive(Debug, Deserialize)]
pub struct MapsItem {
    #[serde(rename = "type")]
    pub kind: String,
    pub rank_absolute: Option<i32>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub domain: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub rating: Option<f64>,
    pub rating_count: Option<i64>,
    pub place_id: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug)]
pub struct MapsLiveResponse {
    pub keyword: String,
    pub items: Vec<MapsItem>,
    pub cost: f64,
}

impl ApiClient {
    /// Google Ads SERP — returns paid results for a keyword. Same
    /// response shape and cost as organic (`SerpLiveResponse` / `SerpItem`).
    pub async fn serp_google_ads_live(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        depth: u32,
    ) -> Result<SerpLiveResponse> {
        self.serp_live_impl(
            keyword,
            location_code,
            language_code,
            depth,
            "/v3/serp/google/ads/live/regular",
        )
        .await
    }

    /// Google News SERP — returns news articles for a keyword.
    pub async fn serp_google_news_live(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        depth: u32,
    ) -> Result<SerpLiveResponse> {
        self.serp_live_impl(
            keyword,
            location_code,
            language_code,
            depth,
            "/v3/serp/google/news/live/regular",
        )
        .await
    }

    /// Google Maps SERP — returns local business listings for a keyword.
    /// Uses the `/advanced` result type because maps results carry structured
    /// place data that requires the richer schema.
    pub async fn serp_google_maps_live(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        depth: u32,
    ) -> Result<MapsLiveResponse> {
        let body = serde_json::json!([{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "depth": depth.clamp(10, 100),
        }]);
        let raw = self
            .post_json(
                Family::SerpLive,
                "/v3/serp/google/maps/live/advanced",
                &body,
            )
            .await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0").ok_or_else(|| {
            AppError::Parse("serp/google/maps response missing tasks[0].result[0]".into())
        })?;
        let keyword_out = result
            .pointer("/keyword")
            .and_then(|v| v.as_str())
            .unwrap_or(keyword)
            .to_owned();
        let items = result
            .pointer("/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw| serde_json::from_value::<MapsItem>(raw.clone()).ok())
                    .collect()
            })
            .unwrap_or_default();
        Ok(MapsLiveResponse { keyword: keyword_out, items, cost })
    }

    /// Shared implementation for SERP endpoints that return `SerpLiveResponse`
    /// (organic, ads, news). Callers supply only the path.
    async fn serp_live_impl(
        &self,
        keyword: &str,
        location_code: u32,
        language_code: &str,
        depth: u32,
        path: &str,
    ) -> Result<SerpLiveResponse> {
        let body = serde_json::json!([{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "depth": depth.clamp(10, 100),
        }]);
        let raw = self.post_json(Family::SerpLive, path, &body).await?;
        let cost = ensure_api_success(&raw)?;
        let result = raw.pointer("/tasks/0/result/0").ok_or_else(|| {
            AppError::Parse(format!("{path} response missing tasks[0].result[0]"))
        })?;
        let keyword_out = result
            .pointer("/keyword")
            .and_then(|v| v.as_str())
            .unwrap_or(keyword)
            .to_owned();
        let items = result
            .pointer("/items")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|raw| serde_json::from_value::<SerpItem>(raw.clone()).ok())
                    .collect()
            })
            .unwrap_or_default();
        Ok(SerpLiveResponse { keyword: keyword_out, items, cost })
    }
}

#[derive(Debug)]
pub struct TaskPostResponse {
    pub task_ids: Vec<String>,
    pub cost: f64,
}
