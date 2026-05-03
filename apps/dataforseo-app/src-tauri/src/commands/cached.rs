//! Cache wrapper for command-layer views.
//!
//! Pattern: each cache-aware command (1) builds a deterministic params
//! blob, (2) calls `lookup` to try the cache, (3) on miss runs the API
//! call, (4) calls `store_view` to persist. The view type owns its
//! own `from_cache`/`fetched_at` fields; the command sets them based
//! on the outcome.
//!
//! We deliberately do NOT serialize cache metadata into the cached
//! payload — the helper resets it on hit so the consumer always sees
//! the right values regardless of which run originally populated the
//! cache row.

use std::sync::Arc;

use chrono::Duration;
use tokio::task;

use crate::domain::cache;
use crate::errors::{AppError, Result};
use crate::store::{response_cache, Store};

pub enum CachedOutcome<V> {
    Hit { view: V, fetched_at: String },
    Miss,
}

pub async fn lookup<V>(
    store: Arc<Store>,
    endpoint: &'static str,
    params: &serde_json::Value,
    ttl: Duration,
    use_cache: bool,
) -> Result<CachedOutcome<V>>
where
    V: serde::de::DeserializeOwned + Send + 'static,
{
    if !use_cache {
        return Ok(CachedOutcome::Miss);
    }
    let params_hash = cache::hash_params(params);
    let store_clone = store.clone();
    let hash_clone = params_hash.clone();
    let hit = task::spawn_blocking(move || {
        store_clone.with_conn(|c| response_cache::get(c, endpoint, &hash_clone, ttl))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;
    Ok(match hit {
        Some(h) => match serde_json::from_value::<V>(h.response) {
            Ok(view) => CachedOutcome::Hit {
                view,
                fetched_at: h.fetched_at,
            },
            // Schema drift between writes — drop the stale row and refetch
            // rather than crashing the command.
            Err(_) => CachedOutcome::Miss,
        },
        None => CachedOutcome::Miss,
    })
}

pub async fn store_view<V: serde::Serialize>(
    store: Arc<Store>,
    endpoint: &'static str,
    params: &serde_json::Value,
    view: &V,
    cost_usd: f64,
) -> Result<()> {
    let params_hash = cache::hash_params(params);
    let json = serde_json::to_value(view).map_err(|e| AppError::Internal(e.to_string()))?;
    task::spawn_blocking(move || {
        store.with_conn(|c| response_cache::put(c, endpoint, &params_hash, &json, cost_usd))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;
    Ok(())
}
