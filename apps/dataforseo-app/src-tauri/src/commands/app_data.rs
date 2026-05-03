//! App Data commands — Google Play + App Store searches and reviews.
//! Cache-aware via the generic response_cache (medium TTL since app
//! reviews change daily but rankings are stickier than SERP).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use ts_rs::TS;

use crate::commands::cached::{self, CachedOutcome};
use crate::commands::ledger::run_with_ledger;
use crate::domain::cache;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AppDataView {
    pub items: Value,
    pub items_count: i64,
    pub total_count: i64,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

async fn app_data_command<F, Fut>(
    state: &State<'_, AppState>,
    endpoint: &'static str,
    cache_params: serde_json::Value,
    use_cache: bool,
    op: F,
) -> Result<AppDataView>
where
    F: FnOnce(std::sync::Arc<crate::api::client::ApiClient>) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<crate::api::app_data::AppDataResponse>> + Send,
{
    let estimated_usd = cost::estimate(&CostAction::AppData);
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<AppDataView>(
        state.store.clone(),
        endpoint,
        &cache_params,
        cache::ttl_short(),
        use_cache,
    )
    .await?
    {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = op(api).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = AppDataView {
        items: resp.items,
        items_count: resp.items_count,
        total_count: resp.total_count,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn app_data_google_play_app_searches(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<AppDataView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let cache_params = serde_json::json!({
        "keyword": &kw, "location_code": location_code,
        "language_code": &language_code, "limit": limit,
    });
    let lang = language_code.clone();
    app_data_command(
        &state,
        endpoints::APP_DATA_GOOGLE_PLAY_SEARCHES,
        cache_params,
        use_cache,
        move |api| async move {
            api.app_data_google_play_app_searches_live(&kw, location_code, &lang, limit).await
        },
    )
    .await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn app_data_apple_app_searches(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<AppDataView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let cache_params = serde_json::json!({
        "keyword": &kw, "location_code": location_code,
        "language_code": &language_code, "limit": limit,
    });
    let lang = language_code.clone();
    app_data_command(
        &state,
        endpoints::APP_DATA_APPLE_SEARCHES,
        cache_params,
        use_cache,
        move |api| async move {
            api.app_data_apple_app_searches_live(&kw, location_code, &lang, limit).await
        },
    )
    .await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn app_data_google_play_app_reviews(
    state: State<'_, AppState>,
    app_id: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<AppDataView> {
    let id = app_id.trim().to_owned();
    if id.is_empty() {
        return Err(AppError::Validation("app_id required".into()));
    }
    let cache_params = serde_json::json!({
        "app_id": &id, "location_code": location_code,
        "language_code": &language_code, "limit": limit,
    });
    let lang = language_code.clone();
    app_data_command(
        &state,
        endpoints::APP_DATA_GOOGLE_PLAY_REVIEWS,
        cache_params,
        use_cache,
        move |api| async move {
            api.app_data_google_play_app_reviews_live(&id, location_code, &lang, limit).await
        },
    )
    .await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn app_data_apple_app_reviews(
    state: State<'_, AppState>,
    app_id: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<AppDataView> {
    let id = app_id.trim().to_owned();
    if id.is_empty() {
        return Err(AppError::Validation("app_id required".into()));
    }
    let cache_params = serde_json::json!({
        "app_id": &id, "location_code": location_code,
        "language_code": &language_code, "limit": limit,
    });
    let lang = language_code.clone();
    app_data_command(
        &state,
        endpoints::APP_DATA_APPLE_REVIEWS,
        cache_params,
        use_cache,
        move |api| async move {
            api.app_data_apple_app_reviews_live(&id, location_code, &lang, limit).await
        },
    )
    .await
}
