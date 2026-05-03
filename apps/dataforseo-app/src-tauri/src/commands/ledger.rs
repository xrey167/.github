use std::sync::Arc;

use tauri::State;
use tokio::task;

use crate::domain::cost::{self, CostAction};
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::ledger::{self, AiCallRow, AiUsageSummary, CallLogRow, LedgerEntry, UsageSummary};
use crate::store::Store;

#[tauri::command]
pub fn estimate_cost(action: CostAction) -> Result<f64> {
    Ok(cost::estimate(&action))
}

/// Run an API call, time it, and append a ledger row whether the call
/// succeeds or fails. The closure returns (response, cost_usd) on success;
/// the caller has the only place that knows where to pull `cost` from on
/// the typed response.
///
/// Concentrating this skeleton in one place is what gives us:
/// - duration_ms measurement on every command,
/// - failure rows with the upstream API status_code (when present), so the
///   Usage page surfaces the user's failed calls,
/// - a single audit trail for the "did we tell DataForSEO about this?"
///   question.
pub async fn run_with_ledger<T, F, Fut>(
    store: Arc<Store>,
    endpoint: &'static str,
    mode: Mode,
    estimated_usd: f64,
    request_size: i64,
    op: F,
) -> Result<T>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<(T, f64)>>,
{
    let start = std::time::Instant::now();
    let result = op().await;
    let duration_ms = start.elapsed().as_millis() as i64;

    let mode_str = mode;
    match result {
        Ok((value, cost_usd)) => {
            let store_clone = store.clone();
            task::spawn_blocking(move || -> Result<()> {
                store_clone.with_conn(|c| {
                    ledger::record(
                        c,
                        &LedgerEntry {
                            endpoint,
                            mode: mode_str,
                            cost_usd,
                            estimated_usd: Some(estimated_usd),
                            request_size: Some(request_size),
                            response_status: Some(20000),
                            duration_ms: Some(duration_ms),
                            task_id: None,
                            error: None,
                        },
                    )
                })
            })
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??;
            Ok(value)
        }
        Err(e) => {
            let status = e.api_status_code();
            let msg = e.to_string();
            let store_clone = store.clone();
            task::spawn_blocking(move || -> Result<()> {
                store_clone.with_conn(|c| {
                    ledger::record(
                        c,
                        &LedgerEntry {
                            endpoint,
                            mode: mode_str,
                            cost_usd: 0.0,
                            estimated_usd: Some(estimated_usd),
                            request_size: Some(request_size),
                            response_status: status,
                            duration_ms: Some(duration_ms),
                            task_id: None,
                            error: Some(&msg),
                        },
                    )
                })
            })
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??;
            Err(e)
        }
    }
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

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_ai_recent_calls(
    state: State<'_, AppState>,
    limit: u32,
) -> Result<Vec<AiCallRow>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| ledger::ai_recent(c, limit))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_ai_usage_summary(
    state: State<'_, AppState>,
    days: u32,
) -> Result<AiUsageSummary> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| ledger::ai_summary(c, days))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

// ---------- Cost Budget ----------

use crate::store::cost_budget::{self, Budget, BudgetStatus};

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_budget_status(
    state: State<'_, AppState>,
    period: String,
) -> Result<BudgetStatus> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| cost_budget::status(c, &period))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn set_budget(state: State<'_, AppState>, budget: Budget) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| cost_budget::upsert(c, &budget))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn clear_budget(state: State<'_, AppState>, period: String) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| cost_budget::delete(c, &period))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

// ---------- Phase A: Appendix endpoints (free diagnostic) ----------

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn appendix_status(state: State<'_, AppState>) -> Result<serde_json::Value> {
    state.api.appendix_status().await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn appendix_errors(state: State<'_, AppState>) -> Result<serde_json::Value> {
    state.api.appendix_errors().await
}
