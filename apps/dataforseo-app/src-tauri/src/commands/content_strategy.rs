//! Content Strategy commands. Phase 1 = editorial calendar CRUD.
//! Topic clusters and the gap-to-brief pipeline land in later phases.

use serde::{Deserialize, Serialize};
use tauri::State;
use ts_rs::TS;

use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store;
use crate::store::content_strategy::PlannedPost;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct PlannedPostInput {
    pub project_id: Option<i64>,
    pub title: String,
    pub target_keyword: Option<String>,
    /// Defaults to "idea" if the caller passes None.
    pub status: Option<String>,
    /// ISO YYYY-MM-DD.
    pub scheduled_for: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn planned_posts_list(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> Result<Vec<PlannedPost>> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| store::content_strategy::list(c, project_id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
pub async fn planned_posts_create(
    state: State<'_, AppState>,
    input: PlannedPostInput,
) -> Result<i64> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| {
            store::content_strategy::create(
                c,
                input.project_id,
                &input.title,
                input.target_keyword.as_deref(),
                input.status.as_deref().unwrap_or("idea"),
                input.scheduled_for.as_deref(),
                input.notes.as_deref(),
            )
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
pub async fn planned_posts_update(
    state: State<'_, AppState>,
    id: i64,
    input: PlannedPostInput,
) -> Result<()> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| {
            store::content_strategy::update(
                c,
                id,
                &input.title,
                input.target_keyword.as_deref(),
                input.status.as_deref().unwrap_or("idea"),
                input.scheduled_for.as_deref(),
                input.notes.as_deref(),
            )
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
pub async fn planned_posts_delete(state: State<'_, AppState>, id: i64) -> Result<()> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| store::content_strategy::delete(c, id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
