use chrono::Duration;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::backlinks::BacklinksDetailArgs;
use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::filters::Filter;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::backlinks;

const SUMMARY_TTL_HOURS: i64 = 24;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BacklinksSummaryView {
    pub target: String,
    pub summary: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    pub from_cache: bool,
    pub fetched_at: Option<String>,
}

/// Fetch the backlinks summary for a target. Hits the 24h cache first;
/// on miss runs the API call through run_with_ledger so the cost shows
/// up in /usage.
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn backlinks_summary(
    state: State<'_, AppState>,
    target: String,
    use_cache: bool,
) -> Result<BacklinksSummaryView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }

    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: 1,
    });

    if use_cache {
        let store = state.store.clone();
        let key = target.clone();
        let cached = task::spawn_blocking(move || -> Result<_> {
            store.with_conn(|c| backlinks::get_summary(c, &key, Duration::hours(SUMMARY_TTL_HOURS)))
        })
        .await
        .map_err(|e| AppError::Internal(e.to_string()))??;
        if let Some((summary, cost_usd, fetched_at)) = cached {
            return Ok(BacklinksSummaryView {
                target,
                summary,
                cost_usd,
                estimated_usd,
                from_cache: true,
                fetched_at: Some(fetched_at),
            });
        }
    }

    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_SUMMARY,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.backlinks_summary_live(&target_for_call).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    let summary_json =
        serde_json::to_value(&resp.summary).map_err(|e| AppError::Parse(e.to_string()))?;

    // Write through to cache.
    let store = state.store.clone();
    let target_for_cache = target.clone();
    let summary_for_cache = summary_json.clone();
    let cost = resp.cost;
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| backlinks::put_summary(c, &target_for_cache, &summary_for_cache, cost))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    Ok(BacklinksSummaryView {
        target,
        summary: summary_json,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    })
}

/// Inputs for `backlinks_detail`. The frontend builds this; the Rust side
/// validates and clamps. `mode` and `backlinks_status_type` are stringly
/// typed to match DataForSEO; we narrow them here so a typo doesn't reach
/// the API.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "camelCase")]
pub struct BacklinksDetailParams {
    pub target: String,
    /// "as_is" | "one_per_domain" | "one_per_anchor"
    pub mode: String,
    /// "all" | "live" | "lost"
    pub status: String,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    /// Optional filter tree from the visual builder / preset dropdown.
    pub filter: Option<Filter>,
    /// e.g. ["domain_from_rank,desc"] — passed through verbatim.
    pub order_by: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BacklinksDetailView {
    pub target: String,
    pub total_count: i64,
    pub items_count: i64,
    pub items: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

const DETAIL_MAX_LIMIT: u32 = 1000;

#[tauri::command]
#[tracing::instrument(skip(state, params))]
pub async fn backlinks_detail(
    state: State<'_, AppState>,
    params: BacklinksDetailParams,
) -> Result<BacklinksDetailView> {
    let target = params.target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let mode = match params.mode.as_str() {
        "as_is" => "as_is",
        "one_per_domain" => "one_per_domain",
        "one_per_anchor" => "one_per_anchor",
        other => {
            return Err(AppError::Validation(format!(
                "invalid mode {other:?}; expected as_is|one_per_domain|one_per_anchor"
            )))
        }
    };
    let status = match params.status.as_str() {
        "all" => "all",
        "live" => "live",
        "lost" => "lost",
        other => {
            return Err(AppError::Validation(format!(
                "invalid status {other:?}; expected all|live|lost"
            )))
        }
    };
    let limit = params.limit.clamp(1, DETAIL_MAX_LIMIT);

    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: limit,
    });

    let api = state.api.clone();
    let filter = params.filter.clone();
    let order_by = params.order_by.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_DETAIL,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let args = BacklinksDetailArgs {
                target: &target_for_call,
                mode,
                limit,
                offset: params.offset,
                include_subdomains: params.include_subdomains,
                backlinks_status_type: status,
                filter: filter.as_ref(),
                order_by,
            };
            let r = api.backlinks_live(args).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    Ok(BacklinksDetailView {
        target: resp.target,
        total_count: resp.total_count,
        items_count: resp.items_count,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
    })
}
