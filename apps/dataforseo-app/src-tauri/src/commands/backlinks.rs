use chrono::Duration;
use serde::Serialize;
use serde_json::Value;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
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
