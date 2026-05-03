//! Site Audit commands. The user starts an audit (task_post), then the
//! background `audit_poller` advances it to ready and persists summary +
//! pages. The UI just polls audit_get periodically until status='ready'.

use tauri::State;
use tokio::task;

use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::audits::{self, AuditPage, AuditRun};

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn audit_start(
    state: State<'_, AppState>,
    target: String,
    max_crawl_pages: u32,
) -> Result<i64> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    if max_crawl_pages == 0 {
        return Err(AppError::Validation("max_crawl_pages must be > 0".into()));
    }
    // Cost preview: 0.000125 USD * max_pages. Actual billing is per-page-
    // crawled; the API can crawl fewer if it can't reach all of them.
    let estimated_usd = cost::estimate(&CostAction::OnPageAudit {
        max_pages: max_crawl_pages,
    });
    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::ON_PAGE_TASK_POST,
        Mode::Standard,
        estimated_usd,
        max_crawl_pages as i64,
        move || async move {
            let r = api
                .on_page_task_post(&target_for_call, max_crawl_pages)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let store = state.store.clone();
    let task_id = resp.task_id.clone();
    let target_for_db = target.clone();
    let cost = resp.cost;
    let id = task::spawn_blocking(move || -> Result<i64> {
        store.with_conn(|c| {
            audits::create_run(c, &target_for_db, &task_id, max_crawl_pages, cost)
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;
    Ok(id)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn audit_list(state: State<'_, AppState>, limit: u32) -> Result<Vec<AuditRun>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| audits::list_runs(c, limit))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn audit_get(state: State<'_, AppState>, id: i64) -> Result<Option<AuditRun>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| audits::get_run(c, id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn audit_pages(
    state: State<'_, AppState>,
    id: i64,
    limit: u32,
    offset: u32,
) -> Result<Vec<AuditPage>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| audits::list_pages(c, id, limit, offset))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn audit_delete(state: State<'_, AppState>, id: i64) -> Result<()> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| audits::delete_run(c, id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
