//! Background poller for SERP standard-queue tasks. Spawned once at app
//! startup; on each tick it advances pending tasks to 'ready' (via
//! /tasks_ready) and fetches results for ready tasks.

use std::sync::Arc;
use std::time::Duration;

use futures::stream::{self, StreamExt, TryStreamExt};
use tokio::task;
use tokio::time;

use crate::api::client::ApiClient;
use crate::errors::{AppError, Result};
use crate::store::{serp_results, serp_tasks, Store};

const POLL_INTERVAL_SECS: u64 = 30;
/// How many task_get calls run concurrently. The SerpTask rate-limiter
/// (2000 rpm sustained) caps absolute throughput; a small concurrency
/// keeps the poller responsive without flooding the runtime.
const TASK_GET_CONCURRENCY: usize = 8;

pub async fn run(api: Arc<ApiClient>, store: Arc<Store>) {
    tracing::info!("serp task poller started (interval {}s)", POLL_INTERVAL_SECS);
    loop {
        // Tick first, then sleep — otherwise a fresh batch sits dormant for
        // a full POLL_INTERVAL_SECS before the first /tasks_ready check.
        if let Err(e) = poll_once(&api, &store).await {
            tracing::warn!(error = %e, "serp poller iteration failed");
        }
        time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
    }
}

async fn poll_once(api: &Arc<ApiClient>, store: &Arc<Store>) -> Result<()> {
    // Pending: ask DataForSEO which of our outstanding tasks finished, mark
    // matches as 'ready'. Skip the network round-trip when we have nothing
    // outstanding, but still process anything already in 'ready' below —
    // a previous tick may have marked them ready and then failed to fetch.
    let pending = blocking(store, serp_tasks::find_pending).await?;
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

    let ready = blocking(store, serp_tasks::find_ready).await?;
    if ready.is_empty() {
        return Ok(());
    }

    // Fetch and persist concurrently. Each network result is handed to a
    // DB write as soon as it arrives, so a slow task_get does not stall
    // persistence of the others. Per-family rate-limiting still bounds
    // absolute throughput inside ApiClient.
    stream::iter(ready.into_iter().map(|t| {
        let api = api.clone();
        async move {
            let r = api.serp_google_organic_task_get_regular(&t.task_id).await;
            (t.task_id, r)
        }
    }))
    .buffer_unordered(TASK_GET_CONCURRENCY)
    .map(Ok::<_, AppError>)
    .try_for_each(|(task_id, result)| async move {
        match result {
            Ok(resp) => {
                let id = task_id;
                let cost = resp.cost;
                blocking(store, move |c| {
                    serp_results::insert_batch(c, &id, &resp.items)?;
                    serp_tasks::mark_fetched(c, &id, cost)?;
                    Ok(())
                })
                .await?;
            }
            Err(e) => {
                tracing::warn!(task_id = %task_id, error = %e, "task_get failed");
                let id = task_id;
                let msg = e.to_string();
                blocking(store, move |c| serp_tasks::record_attempt(c, &id, Some(&msg))).await?;
            }
        }
        Ok(())
    })
    .await?;

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
