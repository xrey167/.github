//! Position tracking commands.

use tauri::State;
use tokio::task;

use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::tracking::{self, RankPoint, TrackedKeywordWithRank};
use crate::tasks::tracker;

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn tracking_add(
    state: State<'_, AppState>,
    target: String,
    keyword: String,
    location_code: u32,
    language_code: String,
    frequency: String,
) -> Result<i64> {
    let target = target.trim().to_owned();
    let keyword = keyword.trim().to_owned();
    if target.is_empty() || keyword.is_empty() {
        return Err(AppError::Validation("target and keyword required".into()));
    }
    if !["daily", "weekly", "manual"].contains(&frequency.as_str()) {
        return Err(AppError::Validation("frequency must be daily/weekly/manual".into()));
    }
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<i64> {
        store.with_conn(|c| tracking::add(c, &target, &keyword, location_code, &language_code, &frequency))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn tracking_list(state: State<'_, AppState>) -> Result<Vec<TrackedKeywordWithRank>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| tracking::list_with_ranks(c))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn tracking_remove(state: State<'_, AppState>, id: i64) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| tracking::delete(c, id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn tracking_history(
    state: State<'_, AppState>,
    id: i64,
    days: u32,
) -> Result<Vec<RankPoint>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| tracking::history(c, id, days))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn tracking_run_now(state: State<'_, AppState>, id: i64) -> Result<()> {
    tracker::run_now(&state.api, &state.store, id).await
}
