use tauri::State;
use tokio::task;

use crate::domain::cost::{self, CostAction};
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::ledger::{self, CallLogRow, UsageSummary};

#[tauri::command]
pub fn estimate_cost(action: CostAction) -> Result<f64> {
    Ok(cost::estimate(&action))
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_recent_calls(
    state: State<'_, AppState>,
    limit: u32,
) -> Result<Vec<CallLogRow>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| ledger::recent(c, limit))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_usage_summary(
    state: State<'_, AppState>,
    days: u32,
) -> Result<UsageSummary> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| ledger::summary(c, days))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
