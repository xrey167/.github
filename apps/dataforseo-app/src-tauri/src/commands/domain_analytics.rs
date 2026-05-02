//! Tauri commands for the Domain Analytics family. Two endpoints:
//! `whois_overview` and `domain_technologies`. Both go through the
//! standard `run_with_ledger` helper so calls show up in /usage.

use serde::Serialize;
use serde_json::Value;
use tauri::State;
use ts_rs::TS;

use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct WhoisView {
    pub domain: String,
    /// Raw item from DataForSEO. Many fields; the page picks the ones it
    /// recognises (registrar, dates, name servers, status).
    pub item: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TechnologiesView {
    pub domain: String,
    /// Whole result blob — has `domain`, `last_visited_date`,
    /// `country_iso_code`, `language_code`, `content_language_code`,
    /// `meta`, and a `technologies` map. UI extracts `technologies`.
    pub result: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn whois_overview(
    state: State<'_, AppState>,
    domain: String,
) -> Result<WhoisView> {
    let domain = domain.trim().to_owned();
    if domain.is_empty() {
        return Err(AppError::Validation("domain required".into()));
    }
    // Single-domain lookup → 1 row → 0.0001 USD baseline.
    let estimated_usd = cost::estimate(&CostAction::DomainAnalyticsWhois { rows: 1 });
    let api = state.api.clone();
    let domain_for_call = domain.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::DOMAIN_ANALYTICS_WHOIS_OVERVIEW,
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

    Ok(WhoisView {
        domain,
        item,
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn domain_technologies(
    state: State<'_, AppState>,
    domain: String,
) -> Result<TechnologiesView> {
    let domain = domain.trim().to_owned();
    if domain.is_empty() {
        return Err(AppError::Validation("domain required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::DomainAnalyticsTechnologies);
    let api = state.api.clone();
    let domain_for_call = domain.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::DOMAIN_ANALYTICS_TECHNOLOGIES,
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

    Ok(TechnologiesView {
        domain,
        result: resp.result,
        cost_usd: resp.cost,
        estimated_usd,
    })
}
