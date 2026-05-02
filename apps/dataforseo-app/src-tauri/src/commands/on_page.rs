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
