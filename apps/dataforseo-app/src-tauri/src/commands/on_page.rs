//! On-Page commands: instant_pages and lighthouse. Both endpoints take
//! a single URL and return a deeply nested audit blob; we cache them
//! through the generic response cache (TTL 7d for the SEO audit, 1d for
//! Lighthouse since perf metrics drift).

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
pub struct OnPageInstantView {
    pub url: String,
    /// Items array from the Instant Pages response. The first row holds
    /// the audit; the UI extracts known sections (meta, content, checks).
    pub items: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LighthouseView {
    pub url: String,
    /// Full Lighthouse JSON. UI pulls categories[*].score for the gauges.
    pub result: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn on_page_instant(
    state: State<'_, AppState>,
    url: String,
    enable_javascript: bool,
    enable_browser_rendering: bool,
    use_cache: bool,
) -> Result<OnPageInstantView> {
    let url = url.trim().to_owned();
    if url.is_empty() {
        return Err(AppError::Validation("url required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::OnPageInstantPages);
    let endpoint = endpoints::ON_PAGE_INSTANT_PAGES;
    let cache_params = serde_json::json!({
        "url": &url,
        "enable_javascript": enable_javascript,
        "enable_browser_rendering": enable_browser_rendering,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<OnPageInstantView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let url_for_call = url.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .on_page_instant_pages_live(
                    &url_for_call,
                    enable_javascript,
                    enable_browser_rendering,
                )
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = OnPageInstantView {
        url: url.clone(),
        items: resp.items,
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
pub async fn on_page_lighthouse(
    state: State<'_, AppState>,
    url: String,
    for_mobile: bool,
    use_cache: bool,
) -> Result<LighthouseView> {
    let url = url.trim().to_owned();
    if url.is_empty() {
        return Err(AppError::Validation("url required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::OnPageLighthouse);
    let endpoint = endpoints::ON_PAGE_LIGHTHOUSE;
    let cache_params = serde_json::json!({
        "url": &url,
        "for_mobile": for_mobile,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<LighthouseView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_volatile(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let url_for_call = url.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.on_page_lighthouse_live_json(&url_for_call, for_mobile).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = LighthouseView {
        url: url.clone(),
        result: resp.result,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Phase A.2: On-Page sub-endpoints (drill into a finished crawl) ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct OnPageItemsView {
    pub items: serde_json::Value,
    pub items_count: i64,
    pub total_count: i64,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

async fn on_page_items_command<F, Fut>(
    state: &State<'_, AppState>,
    endpoint: &'static str,
    cache_params: serde_json::Value,
    limit: u32,
    op: F,
    use_cache: bool,
) -> Result<OnPageItemsView>
where
    F: FnOnce(std::sync::Arc<crate::api::client::ApiClient>) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<crate::api::on_page::OnPageItemsResponse>> + Send,
{
    let estimated_usd = cost::estimate(&CostAction::OnPageSubItems { rows: limit });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<OnPageItemsView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
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
        limit as i64,
        move || async move {
            let r = op(api).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = OnPageItemsView {
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

macro_rules! on_page_sub_command {
    ($fn_name:ident, $endpoint:expr, $api_method:ident) => {
        #[tauri::command]
        #[tracing::instrument(skip(state))]
        pub async fn $fn_name(
            state: State<'_, AppState>,
            task_id: String,
            limit: u32,
            offset: u32,
            use_cache: bool,
        ) -> Result<OnPageItemsView> {
            if task_id.is_empty() {
                return Err(AppError::Validation("task_id required".into()));
            }
            let cache_params = serde_json::json!({
                "task_id": &task_id, "limit": limit, "offset": offset,
            });
            let id_for_call = task_id.clone();
            on_page_items_command(&state, $endpoint, cache_params, limit, move |api| async move {
                api.$api_method(&id_for_call, limit, offset).await
            }, use_cache).await
        }
    };
}

on_page_sub_command!(on_page_pages_get, endpoints::ON_PAGE_PAGES, on_page_pages_endpoint);
on_page_sub_command!(on_page_resources_get, endpoints::ON_PAGE_RESOURCES, on_page_resources);
on_page_sub_command!(on_page_duplicate_tags_get, endpoints::ON_PAGE_DUPLICATE_TAGS, on_page_duplicate_tags);
on_page_sub_command!(on_page_links_get, endpoints::ON_PAGE_LINKS, on_page_links);
on_page_sub_command!(on_page_non_indexable_get, endpoints::ON_PAGE_NON_INDEXABLE, on_page_non_indexable);
on_page_sub_command!(on_page_redirect_chains_get, endpoints::ON_PAGE_REDIRECT_CHAINS, on_page_redirect_chains);
on_page_sub_command!(on_page_microdata_get, endpoints::ON_PAGE_MICRODATA, on_page_microdata);
on_page_sub_command!(on_page_keyword_density_get, endpoints::ON_PAGE_KEYWORD_DENSITY, on_page_keyword_density);

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn on_page_pages_by_resource_get(
    state: State<'_, AppState>,
    task_id: String,
    url: String,
    limit: u32,
    offset: u32,
    use_cache: bool,
) -> Result<OnPageItemsView> {
    if task_id.is_empty() || url.is_empty() {
        return Err(AppError::Validation("task_id and url required".into()));
    }
    let cache_params = serde_json::json!({
        "task_id": &task_id, "url": &url, "limit": limit, "offset": offset,
    });
    let id = task_id.clone();
    let u = url.clone();
    on_page_items_command(&state, endpoints::ON_PAGE_PAGES_BY_RESOURCE, cache_params, limit, move |api| async move {
        api.on_page_pages_by_resource(&id, &u, limit, offset).await
    }, use_cache).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn on_page_duplicate_content_get(
    state: State<'_, AppState>,
    task_id: String,
    url: String,
    limit: u32,
    offset: u32,
    use_cache: bool,
) -> Result<OnPageItemsView> {
    if task_id.is_empty() || url.is_empty() {
        return Err(AppError::Validation("task_id and url required".into()));
    }
    let cache_params = serde_json::json!({
        "task_id": &task_id, "url": &url, "limit": limit, "offset": offset,
    });
    let id = task_id.clone();
    let u = url.clone();
    on_page_items_command(&state, endpoints::ON_PAGE_DUPLICATE_CONTENT, cache_params, limit, move |api| async move {
        api.on_page_duplicate_content(&id, &u, limit, offset).await
    }, use_cache).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn on_page_content_parsing_command(
    state: State<'_, AppState>,
    url: String,
) -> Result<serde_json::Value> {
    let url = url.trim().to_owned();
    if url.is_empty() {
        return Err(AppError::Validation("url required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::OnPageContentParsing);
    let api = state.api.clone();
    let url_for_call = url.clone();
    run_with_ledger(
        state.store.clone(),
        endpoints::ON_PAGE_CONTENT_PARSING,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.on_page_content_parsing_live(&url_for_call).await?;
            // Content Parsing live doesn't surface a per-call cost field; use the estimate.
            Ok((r, estimated_usd))
        },
    )
    .await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn on_page_lighthouse_audits_get(
    state: State<'_, AppState>,
) -> Result<serde_json::Value> {
    state.api.on_page_lighthouse_audits().await
}
