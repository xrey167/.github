//! Content Strategy commands. Phase 1 = editorial calendar CRUD.
//! Phase 2 = topic clusters (this file). Phase 3 = LLM brief generator.

use serde::{Deserialize, Serialize};
use tauri::State;
use ts_rs::TS;

use crate::ai::prompts::CONTENT_BRIEF;
use crate::ai::{ChatMessage, Role};
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

// ---------- content brief generator (phase 3) ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct ContentBrief {
    pub post_id: i64,
    pub brief_md: String,
    pub model: String,
    /// Output-side cost from the latest generation. The frontend can
    /// surface this so the user knows what the call cost.
    pub cost_usd: f64,
}

/// Generate (and persist) an SEO content brief for a planned post using
/// the active AI provider. Pulls the post + its cluster (if any) for
/// context, hands them to the LLM, stores the result on the row.
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn content_brief_generate(
    state: State<'_, AppState>,
    post_id: i64,
) -> Result<ContentBrief> {
    let client = state
        .ai
        .get()
        .await
        .ok_or_else(|| AppError::Auth("no AI provider configured".into()))?;

    // Pull post + optional cluster in one DB hit so the caller sees a
    // consistent snapshot even if another tab edits the row mid-flight.
    let store = state.store.clone();
    let (post, cluster) = tokio::task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| {
            let post = store::content_strategy::get(c, post_id)?
                .ok_or_else(|| AppError::Validation(format!("planned post {post_id} not found")))?;
            let cluster = match post.cluster_id {
                Some(cid) => store::content_strategy::cluster_get(c, cid)?,
                None => None,
            };
            Ok((post, cluster))
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    // Build the user-side context message. Keep it terse — the brief
    // template does the heavy lifting in the system prompt.
    let mut user_msg = String::new();
    user_msg.push_str(&format!("Title: {}\n", post.title));
    if let Some(kw) = &post.target_keyword {
        user_msg.push_str(&format!("Target keyword: {kw}\n"));
    }
    if let Some(c) = &cluster {
        user_msg.push_str(&format!("Cluster: {}", c.name));
        if let Some(p) = &c.pillar_keyword {
            user_msg.push_str(&format!(" (pillar: {p})"));
        }
        user_msg.push('\n');
        if let Some(d) = &c.description {
            user_msg.push_str(&format!("Cluster context: {d}\n"));
        }
    }
    if let Some(notes) = &post.notes {
        if !notes.trim().is_empty() {
            user_msg.push_str(&format!("\nUser notes:\n{notes}\n"));
        }
    }

    let messages = vec![ChatMessage {
        role: Role::User,
        content: user_msg,
    }];

    let response = client
        .chat_with_system(Some(CONTENT_BRIEF.system), &messages)
        .await?;

    // Persist the brief so the UI reload picks it up immediately.
    let store = state.store.clone();
    let brief_md = response.content.clone();
    let model = response.model.clone();
    tokio::task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| store::content_strategy::set_brief(c, post_id, &brief_md, &model))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    Ok(ContentBrief {
        post_id,
        brief_md: response.content,
        model: response.model,
        cost_usd: response.usage.cost_usd,
    })
}
