//! Background position tracker. Wakes hourly; pulls due tracked
//! keywords from the store; runs SERP organic Live for each; finds
//! the target domain in the result set; records `rank_absolute`
//! (or NULL if the domain isn't in the top 100). The 1h cadence
//! plus the per-row `frequency` interval (daily/weekly) means a
//! 100-keyword daily set costs ~0.20 USD/day.

use std::sync::Arc;
use std::time::Duration;

use tokio::time;

use crate::api::client::ApiClient;
use crate::errors::{AppError, Result};
use crate::store::{tracking, Store};

const TICK_INTERVAL_SECS: u64 = 60 * 60; // 1h
const SERP_DEPTH: u32 = 100; // top 100 results to find buried rankings
const MAX_PER_TICK: u32 = 200; // safety cap so a 10k-row set doesn't spike

pub async fn run(api: Arc<ApiClient>, store: Arc<Store>) {
    tracing::info!("position tracker started (interval {}s)", TICK_INTERVAL_SECS);
    loop {
        if let Err(e) = tick(&api, &store).await {
            tracing::warn!(error = %e, "tracker iteration failed");
        }
        time::sleep(Duration::from_secs(TICK_INTERVAL_SECS)).await;
    }
}

async fn tick(api: &Arc<ApiClient>, store: &Arc<Store>) -> Result<()> {
    let due = {
        let store = store.clone();
        tokio::task::spawn_blocking(move || store.with_conn(|c| tracking::due(c, MAX_PER_TICK)))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??
    };
    if due.is_empty() {
        return Ok(());
    }
    tracing::info!(count = due.len(), "tracker tick: running due keywords");
    for k in due {
        if let Err(e) = run_one(api, store, &k).await {
            // Failures shouldn't kill the loop — they're per-keyword and
            // common (rate limit, target temporarily down). Skip and try
            // again next tick.
            tracing::warn!(id = k.id, keyword = %k.keyword, error = %e, "tracker run failed");
        }
    }
    Ok(())
}

async fn run_one(
    api: &Arc<ApiClient>,
    store: &Arc<Store>,
    k: &tracking::TrackedKeyword,
) -> Result<()> {
    let resp = api
        .serp_google_organic_live(
            &k.keyword,
            k.location_code as u32,
            &k.language_code,
            SERP_DEPTH,
        )
        .await?;
    // Find the lowest rank_absolute matching the target domain. SERP items
    // include the domain split out; falling back to a `url contains target`
    // catches edge cases where the domain field is the apex but the target
    // is a subdomain or path.
    let target = k.target.to_ascii_lowercase();
    let (rank, url) = resp
        .items
        .iter()
        .filter_map(|item| {
            let domain_match = item
                .domain
                .as_ref()
                .map(|d| d.to_ascii_lowercase().contains(&target))
                .unwrap_or(false);
            let url_match = item
                .url
                .as_ref()
                .map(|u| u.to_ascii_lowercase().contains(&target))
                .unwrap_or(false);
            if domain_match || url_match {
                let rank = item.rank_absolute?;
                Some((rank, item.url.clone()))
            } else {
                None
            }
        })
        .min_by_key(|(r, _)| *r)
        .map(|(r, u)| (Some(r), u))
        .unwrap_or((None, None));

    let store = store.clone();
    let id = k.id;
    let url_owned = url.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|c| tracking::record_result(c, id, rank, url_owned.as_deref()))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;
    Ok(())
}

/// Run a single tracked keyword on demand (Refresh button in the UI).
/// Same body as `run_one` but exposed as a public callable.
pub async fn run_now(api: &Arc<ApiClient>, store: &Arc<Store>, id: i64) -> Result<()> {
    let k = {
        let store = store.clone();
        tokio::task::spawn_blocking(move || store.with_conn(|c| tracking::get(c, id)))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??
    };
    let k = k.ok_or_else(|| AppError::Validation(format!("tracked keyword {id} not found")))?;
    run_one(api, store, &k).await
}
