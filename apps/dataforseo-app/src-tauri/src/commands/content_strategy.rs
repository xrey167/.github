//! Content Strategy commands. Phase 1 = editorial calendar CRUD.
//! Phase 2 = topic clusters (this file). Phase 3 = LLM brief generator.

use serde::{Deserialize, Serialize};
use tauri::State;
use ts_rs::TS;

use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store;
use crate::store::content_strategy::{PlannedPost, TopicCluster};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct PlannedPostInput {
    pub project_id: Option<i64>,
    pub cluster_id: Option<i64>,
    pub title: String,
    pub target_keyword: Option<String>,
    /// Defaults to "idea" if the caller passes None.
    pub status: Option<String>,
    /// ISO YYYY-MM-DD.
    pub scheduled_for: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TopicClusterInput {
    pub project_id: Option<i64>,
    pub name: String,
    pub pillar_keyword: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
}

// ---------- planned_posts commands ----------

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
                input.cluster_id,
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
                input.cluster_id,
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

// ---------- topic_clusters commands ----------

#[tauri::command]
pub async fn topic_clusters_list(
    state: State<'_, AppState>,
    project_id: Option<i64>,
) -> Result<Vec<TopicCluster>> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| store::content_strategy::cluster_list(c, project_id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
pub async fn topic_clusters_create(
    state: State<'_, AppState>,
    input: TopicClusterInput,
) -> Result<i64> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| {
            store::content_strategy::cluster_create(
                c,
                input.project_id,
                &input.name,
                input.pillar_keyword.as_deref(),
                input.description.as_deref(),
                input.color.as_deref(),
            )
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
pub async fn topic_clusters_update(
    state: State<'_, AppState>,
    id: i64,
    input: TopicClusterInput,
) -> Result<()> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| {
            store::content_strategy::cluster_update(
                c,
                id,
                &input.name,
                input.pillar_keyword.as_deref(),
                input.description.as_deref(),
                input.color.as_deref(),
            )
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
pub async fn topic_clusters_delete(state: State<'_, AppState>, id: i64) -> Result<()> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| store::content_strategy::cluster_delete(c, id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
