//! Background poller for Site Audit (On-Page) crawls.
//!
//! Mirrors the SERP poller pattern — wakes every 60s, asks DataForSEO
//! which of our outstanding audits are ready, then for each ready task
//! pulls /summary + /pages and persists. Errors are per-row; the loop
//! always runs to completion so one stuck audit never blocks others.

use std::sync::Arc;
use std::time::Duration;

use tokio::time;

use crate::api::client::ApiClient;
use crate::errors::{AppError, Result};
use crate::store::{audits, Store};

const POLL_INTERVAL_SECS: u64 = 60;
const PAGES_PER_FETCH: u32 = 1000;

pub async fn run(api: Arc<ApiClient>, store: Arc<Store>) {
    tracing::info!(
        "audit poller started (interval {}s)",
        POLL_INTERVAL_SECS
    );
    loop {
        if let Err(e) = tick(&api, &store).await {
            tracing::warn!(error = %e, "audit poller iteration failed");
        }
        time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
    }
}

async fn tick(api: &Arc<ApiClient>, store: &Arc<Store>) -> Result<()> {
    let pending = blocking(store, |c| audits::find_pending_runs(c)).await?;
    if pending.is_empty() {
        return Ok(());
    }

    // Ask which task_ids finished. DataForSEO only returns the task_id
    // once after it transitions to ready, so we trust this set as the
    // authoritative "fetch now" trigger.
    let ready_ids = match api.on_page_tasks_ready().await {
        Ok(ids) => ids,
        Err(e) => {
            tracing::warn!(error = %e, "on_page_tasks_ready failed");
            return Ok(());
        }
    };

    // Mark every pending row as 'running' + bump last_polled_at, since
    // /tasks_ready is the only progress signal we have.
    for (run_id, _task_id) in &pending {
        let id = *run_id;
        let _ = blocking(store, move |c| audits::mark_polled(c, id)).await;
    }
    if ready_ids.is_empty() {
        return Ok(());
    }

    for (run_id, task_id) in pending {
        if !ready_ids.contains(&task_id) {
            continue;
        }
        if let Err(e) = fetch_and_store(api, store, run_id, &task_id).await {
            let msg = e.to_string();
            tracing::warn!(run_id, task_id = %task_id, error = %msg, "audit fetch failed");
            let m = msg.clone();
            let _ = blocking(store, move |c| audits::mark_failed(c, run_id, &m)).await;
        }
    }
    Ok(())
}

async fn fetch_and_store(
    api: &Arc<ApiClient>,
    store: &Arc<Store>,
    run_id: i64,
    task_id: &str,
) -> Result<()> {
    let summary = api.on_page_summary(task_id).await?;
    let pages_value = api.on_page_pages(task_id, PAGES_PER_FETCH, 0).await?;
    let pages: Vec<serde_json::Value> = pages_value
        .as_array()
        .cloned()
        .unwrap_or_default();
    let store = store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| audits::mark_ready(c, run_id, &summary, &pages))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;
    Ok(())
}

async fn blocking<T, F>(store: &Arc<Store>, f: F) -> Result<T>
where
    T: Send + 'static,
    F: FnOnce(&mut duckdb::Connection) -> Result<T> + Send + 'static,
{
    let store = store.clone();
    tokio::task::spawn_blocking(move || store.with_conn(f))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
