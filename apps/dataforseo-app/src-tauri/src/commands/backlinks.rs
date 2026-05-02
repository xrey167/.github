use chrono::Duration;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::backlinks::{
    BacklinksDetailArgs, BacklinksIntersectionArgs, BacklinksListArgs,
};
use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::filters::Filter;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::backlinks;

const SUMMARY_TTL_HOURS: i64 = 24;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BacklinksSummaryView {
    pub target: String,
    pub summary: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    pub from_cache: bool,
    pub fetched_at: Option<String>,
}

/// Fetch the backlinks summary for a target. Hits the 24h cache first;
/// on miss runs the API call through run_with_ledger so the cost shows
/// up in /usage.
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn backlinks_summary(
    state: State<'_, AppState>,
    target: String,
    use_cache: bool,
) -> Result<BacklinksSummaryView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }

    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: 1,
    });

    if use_cache {
        let store = state.store.clone();
        let key = target.clone();
        let cached = task::spawn_blocking(move || -> Result<_> {
            store.with_conn(|c| backlinks::get_summary(c, &key, Duration::hours(SUMMARY_TTL_HOURS)))
        })
        .await
        .map_err(|e| AppError::Internal(e.to_string()))??;
        if let Some((summary, cost_usd, fetched_at)) = cached {
            return Ok(BacklinksSummaryView {
                target,
                summary,
                cost_usd,
                estimated_usd,
                from_cache: true,
                fetched_at: Some(fetched_at),
            });
        }
    }

    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_SUMMARY,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.backlinks_summary_live(&target_for_call).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    let summary_json =
        serde_json::to_value(&resp.summary).map_err(|e| AppError::Parse(e.to_string()))?;

    // Write through to cache.
    let store = state.store.clone();
    let target_for_cache = target.clone();
    let summary_for_cache = summary_json.clone();
    let cost = resp.cost;
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| backlinks::put_summary(c, &target_for_cache, &summary_for_cache, cost))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    Ok(BacklinksSummaryView {
        target,
        summary: summary_json,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    })
}

/// Inputs for `backlinks_detail`. The frontend builds this; the Rust side
/// validates and clamps. `mode` and `backlinks_status_type` are stringly
/// typed to match DataForSEO; we narrow them here so a typo doesn't reach
/// the API.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "camelCase")]
pub struct BacklinksDetailParams {
    pub target: String,
    /// "as_is" | "one_per_domain" | "one_per_anchor"
    pub mode: String,
    /// "all" | "live" | "lost"
    pub status: String,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    /// Optional filter tree from the visual builder / preset dropdown.
    pub filter: Option<Filter>,
    /// e.g. ["domain_from_rank,desc"] — passed through verbatim.
    pub order_by: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BacklinksDetailView {
    pub target: String,
    pub total_count: i64,
    pub items_count: i64,
    pub items: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

const DETAIL_MAX_LIMIT: u32 = 1000;

#[tauri::command]
#[tracing::instrument(skip(state, params))]
pub async fn backlinks_detail(
    state: State<'_, AppState>,
    params: BacklinksDetailParams,
) -> Result<BacklinksDetailView> {
    let target = params.target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let mode = match params.mode.as_str() {
        "as_is" => "as_is",
        "one_per_domain" => "one_per_domain",
        "one_per_anchor" => "one_per_anchor",
        other => {
            return Err(AppError::Validation(format!(
                "invalid mode {other:?}; expected as_is|one_per_domain|one_per_anchor"
            )))
        }
    };
    let status = match params.status.as_str() {
        "all" => "all",
        "live" => "live",
        "lost" => "lost",
        other => {
            return Err(AppError::Validation(format!(
                "invalid status {other:?}; expected all|live|lost"
            )))
        }
    };
    let limit = params.limit.clamp(1, DETAIL_MAX_LIMIT);

    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: limit,
    });

    let api = state.api.clone();
    let filter = params.filter.clone();
    let order_by = params.order_by.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_DETAIL,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let args = BacklinksDetailArgs {
                target: &target_for_call,
                mode,
                limit,
                offset: params.offset,
                include_subdomains: params.include_subdomains,
                backlinks_status_type: status,
                filter: filter.as_ref(),
                order_by,
            };
            let r = api.backlinks_live(args).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    Ok(BacklinksDetailView {
        target: resp.target,
        total_count: resp.total_count,
        items_count: resp.items_count,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
    })
}

// ---------- Referring Domains, Anchors, History ----------

/// Inputs for the two list endpoints (referring_domains, anchors). They
/// share the target/limit/offset/filter shape — only the URL differs, which
/// the backend picks based on which command the frontend invokes.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "camelCase")]
pub struct BacklinksListParams {
    pub target: String,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    pub filter: Option<Filter>,
    pub order_by: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BacklinksListView {
    pub target: String,
    pub total_count: i64,
    pub items_count: i64,
    pub items: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

const LIST_MAX_LIMIT: u32 = 1000;

#[tauri::command]
#[tracing::instrument(skip(state, params))]
pub async fn backlinks_referring_domains(
    state: State<'_, AppState>,
    params: BacklinksListParams,
) -> Result<BacklinksListView> {
    let target = params.target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let limit = params.limit.clamp(1, LIST_MAX_LIMIT);
    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: limit,
    });
    let api = state.api.clone();
    let filter = params.filter.clone();
    let order_by = params.order_by.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_REFERRING_DOMAINS,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let args = BacklinksListArgs {
                target: &target_for_call,
                limit,
                offset: params.offset,
                include_subdomains: params.include_subdomains,
                filter: filter.as_ref(),
                order_by,
            };
            let r = api.backlinks_referring_domains_live(args).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(BacklinksListView {
        target: resp.target,
        total_count: resp.total_count,
        items_count: resp.items_count,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state, params))]
pub async fn backlinks_anchors(
    state: State<'_, AppState>,
    params: BacklinksListParams,
) -> Result<BacklinksListView> {
    let target = params.target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let limit = params.limit.clamp(1, LIST_MAX_LIMIT);
    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: limit,
    });
    let api = state.api.clone();
    let filter = params.filter.clone();
    let order_by = params.order_by.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_ANCHORS,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let args = BacklinksListArgs {
                target: &target_for_call,
                limit,
                offset: params.offset,
                include_subdomains: params.include_subdomains,
                filter: filter.as_ref(),
                order_by,
            };
            let r = api.backlinks_anchors_live(args).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(BacklinksListView {
        target: resp.target,
        total_count: resp.total_count,
        items_count: resp.items_count,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "camelCase")]
pub struct BacklinksHistoryParams {
    pub target: String,
    /// YYYY-MM-DD; both ends are optional. DataForSEO defaults to the last
    /// available year if not specified.
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state, params))]
pub async fn backlinks_history(
    state: State<'_, AppState>,
    params: BacklinksHistoryParams,
) -> Result<BacklinksListView> {
    let target = params.target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    // History is billed per-request only — no per-row component, even
    // though one call returns ~60 monthly snapshots. Match the summary
    // endpoint (which is also flat-fee) and pass rows_per_target: 1 so
    // the cost preview shows the same 0.02 USD as the actual charge.
    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: 1,
    });

    let api = state.api.clone();
    let target_for_call = target.clone();
    let date_from = params.date_from.clone();
    let date_to = params.date_to.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_HISTORY,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .backlinks_history_live(
                    &target_for_call,
                    date_from.as_deref(),
                    date_to.as_deref(),
                )
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    Ok(BacklinksListView {
        target: resp.target,
        total_count: resp.total_count,
        items_count: resp.items_count,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
    })
}

// ---------- Domain Intersection (Link Gap) ----------

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "camelCase")]
pub struct BacklinksIntersectionParams {
    pub target_a: String,
    pub target_b: String,
    /// "intersect" (domains linking to both) | "exclude" (linking to A
    /// but not B). The frontend toggles between these.
    pub intersection_mode: String,
    pub limit: u32,
    pub offset: u32,
    pub include_subdomains: bool,
    pub filter: Option<Filter>,
    pub order_by: Option<Vec<String>>,
}

#[tauri::command]
#[tracing::instrument(skip(state, params))]
pub async fn backlinks_domain_intersection(
    state: State<'_, AppState>,
    params: BacklinksIntersectionParams,
) -> Result<BacklinksListView> {
    let target_a = params.target_a.trim().to_owned();
    let target_b = params.target_b.trim().to_owned();
    if target_a.is_empty() || target_b.is_empty() {
        return Err(AppError::Validation(
            "both targets required".into(),
        ));
    }
    let mode = match params.intersection_mode.as_str() {
        "intersect" => "intersect",
        "exclude" => "exclude",
        other => {
            return Err(AppError::Validation(format!(
                "invalid intersection_mode {other:?}; expected intersect|exclude"
            )))
        }
    };
    let limit = params.limit.clamp(1, LIST_MAX_LIMIT);

    // Same per-row pricing as referring_domains.
    let estimated_usd = cost::estimate(&CostAction::Backlinks {
        target_count: 1,
        rows_per_target: limit,
    });

    let api = state.api.clone();
    let filter = params.filter.clone();
    let order_by = params.order_by.clone();
    let target_a_for_call = target_a.clone();
    let target_b_for_call = target_b.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::BACKLINKS_DOMAIN_INTERSECTION,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let args = BacklinksIntersectionArgs {
                target_a: &target_a_for_call,
                target_b: &target_b_for_call,
                intersection_mode: mode,
                limit,
                offset: params.offset,
                include_subdomains: params.include_subdomains,
                filter: filter.as_ref(),
                order_by,
            };
            let r = api.backlinks_domain_intersection_live(args).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    Ok(BacklinksListView {
        target: resp.target,
        total_count: resp.total_count,
        items_count: resp.items_count,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
    })
}
