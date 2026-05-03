//! Commands for managing scheduled PDF reports.

use tauri::State;
use tokio::task;

use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::reports::{self, ReportRun, ReportSchedule};

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn reports_list_schedules(state: State<'_, AppState>) -> Result<Vec<ReportSchedule>> {
    let store = state.store.clone();
    task::spawn_blocking(move || store.with_conn(reports::list_schedules))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn reports_create_schedule(
    state: State<'_, AppState>,
    project_id: Option<i64>,
    kind: String,
    cadence: String,
) -> Result<i64> {
    let valid_kinds = ["daily-tracking", "weekly-audit", "weekly-brand"];
    let valid_cadences = ["daily", "weekly"];
    if !valid_kinds.contains(&kind.as_str()) {
        return Err(AppError::Validation(format!("invalid kind: {kind}")));
    }
    if !valid_cadences.contains(&cadence.as_str()) {
        return Err(AppError::Validation(format!("invalid cadence: {cadence}")));
    }
    let store = state.store.clone();
    task::spawn_blocking(move || store.with_conn(|c| reports::create_schedule(c, project_id, &kind, &cadence)))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn reports_toggle_schedule(
    state: State<'_, AppState>,
    id: i64,
    active: bool,
) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || store.with_conn(|c| reports::toggle_schedule(c, id, active)))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn reports_delete_schedule(state: State<'_, AppState>, id: i64) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || store.with_conn(|c| reports::delete_schedule(c, id)))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn reports_list_runs(
    state: State<'_, AppState>,
    schedule_id: i64,
) -> Result<Vec<ReportRun>> {
    let store = state.store.clone();
    task::spawn_blocking(move || store.with_conn(|c| reports::list_runs(c, schedule_id, 20)))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
