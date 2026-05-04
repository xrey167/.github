//! Multi-domain project commands. Thin wrappers over store/projects.

use tauri::State;
use tokio::task;

use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::projects::{self, Project};

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn projects_list(state: State<'_, AppState>) -> Result<Vec<Project>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(projects::list)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn projects_create(
    state: State<'_, AppState>,
    name: String,
    target: String,
) -> Result<i64> {
    let name = name.trim().to_owned();
    let target = target.trim().to_owned();
    if name.is_empty() || target.is_empty() {
        return Err(AppError::Validation("name and target required".into()));
    }
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<i64> {
        store.with_conn(|c| projects::create(c, &name, &target))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn projects_rename(
    state: State<'_, AppState>,
    id: i64,
    name: String,
) -> Result<()> {
    let name = name.trim().to_owned();
    if name.is_empty() {
        return Err(AppError::Validation("name required".into()));
    }
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| projects::rename(c, id, &name))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn projects_delete(state: State<'_, AppState>, id: i64) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| projects::delete(c, id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
