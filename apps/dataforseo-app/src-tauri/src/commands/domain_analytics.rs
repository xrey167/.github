//! Tauri commands for the Domain Analytics family. Two endpoints:
//! `whois_overview` and `domain_technologies`. Both go through the
//! standard `run_with_ledger` helper so calls show up in /usage, and
//! both opt into the generic response cache (long TTL — registrar
//! info and tech stacks change rarely).

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
pub struct WhoisView {
    pub domain: String,
    /// Raw item from DataForSEO. Many fields; the page picks the ones it
    /// recognises (registrar, dates, name servers, status).
    pub item: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TechnologiesView {
    pub domain: String,
    /// Whole result blob — has `domain`, `last_visited_date`,
    /// `country_iso_code`, `language_code`, `content_language_code`,
    /// `meta`, and a `technologies` map. UI extracts `technologies`.
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
pub async fn whois_overview(
    state: State<'_, AppState>,
    domain: String,
    use_cache: bool,
) -> Result<WhoisView> {
    let domain = domain.trim().to_owned();
    if domain.is_empty() {
        return Err(AppError::Validation("domain required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::DomainAnalyticsWhois { rows: 1 });
    let cache_params = serde_json::json!({ "domain": &domain });
    let endpoint = endpoints::DOMAIN_ANALYTICS_WHOIS_OVERVIEW;

    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<WhoisView>(
        state.store.clone(),
        endpoint,
        &cache_params,
        cache::ttl_long(),
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
    let domain_for_call = domain.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.whois_overview_live(&domain_for_call).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    // Pull out the first item; whois/overview returns one row per target
    // and we always send a single target. Fall back to Null if the API
    // returned an empty array for an unregistered/invalid domain.
    let item = resp
        .items
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or(Value::Null);

    let view = WhoisView {
        domain: domain.clone(),
        item,
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
pub async fn domain_technologies(
    state: State<'_, AppState>,
    domain: String,
    use_cache: bool,
) -> Result<TechnologiesView> {
    let domain = domain.trim().to_owned();
    if domain.is_empty() {
        return Err(AppError::Validation("domain required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::DomainAnalyticsTechnologies);
    let cache_params = serde_json::json!({ "domain": &domain });
    let endpoint = endpoints::DOMAIN_ANALYTICS_TECHNOLOGIES;

    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<TechnologiesView>(
        state.store.clone(),
        endpoint,
        &cache_params,
        cache::ttl_medium(),
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
    let domain_for_call = domain.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.domain_technologies_live(&domain_for_call).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    let view = TechnologiesView {
        domain: domain.clone(),
        result: resp.result,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}
