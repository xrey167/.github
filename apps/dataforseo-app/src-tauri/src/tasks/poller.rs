//! Background poller for SERP standard-queue tasks.
//!
//! Source: docs/DATAFORSEO_ARCHITECTURE.md Teil 7. Spawned once at app
//! startup; on each tick it advances pending tasks to 'ready' (via
//! /tasks_ready) and fetches results for ready tasks.

use std::sync::Arc;
use std::time::Duration;

use tokio::task;
use tokio::time;

use crate::api::client::ApiClient;
use crate::errors::{AppError, Result};
use crate::store::{serp_results, serp_tasks, Store};

const POLL_INTERVAL_SECS: u64 = 30;

pub async fn run(api: Arc<ApiClient>, store: Arc<Store>) {
    tracing::info!("serp task poller started (interval {}s)", POLL_INTERVAL_SECS);
    loop {
        time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
        if let Err(e) = poll_once(&api, &store).await {
            tracing::warn!(error = %e, "serp poller iteration failed");
        }
    }
}

async fn poll_once(api: &Arc<ApiClient>, store: &Arc<Store>) -> Result<()> {
    // Pending: ask DataForSEO which of our outstanding tasks finished, mark
    // matches as 'ready'. Skip the network round-trip when we have nothing
    // outstanding, but still process anything already in 'ready' below —
    // a previous tick may have marked them ready and then failed to fetch.
    let pending = blocking(store, |c| serp_tasks::find_pending(c)).await?;
    if !pending.is_empty() {
        let ready_ids = api.serp_google_organic_tasks_ready().await?;
        if !ready_ids.is_empty() {
            blocking(store, move |c| {
                for id in &ready_ids {
                    serp_tasks::mark_ready(c, id)?;
                }
                Ok(())
            })
            .await?;
        }
    }

    let ready = blocking(store, |c| serp_tasks::find_ready(c)).await?;
    for task in ready {
        match api.serp_google_organic_task_get_regular(&task.task_id).await {
            Ok(resp) => {
                let task_id = task.task_id.clone();
                let cost = resp.cost;
                blocking(store, move |c| {
                    serp_results::insert_batch(c, &task_id, &resp.items)?;
                    serp_tasks::mark_fetched(c, &task_id, cost)?;
                    Ok(())
                })
                .await?;
            }
            Err(e) => {
                tracing::warn!(task_id = %task.task_id, error = %e, "task_get failed");
                let task_id = task.task_id.clone();
                let msg = e.to_string();
                blocking(store, move |c| {
                    serp_tasks::record_attempt(c, &task_id, Some(&msg))
                })
                .await?;
            }
        }
    }

    Ok(())
}

async fn blocking<T, F>(store: &Arc<Store>, f: F) -> Result<T>
where
    T: Send + 'static,
    F: FnOnce(&mut duckdb::Connection) -> Result<T> + Send + 'static,
{
    let store = store.clone();
    task::spawn_blocking(move || store.with_conn(f))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}
