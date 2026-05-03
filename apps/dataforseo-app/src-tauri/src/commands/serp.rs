use serde::Serialize;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::serp::{MapsItem, SerpItem};
use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SerpResultItem {
    pub kind: String,
    pub rank_absolute: Option<i32>,
    pub url: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub domain: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SerpLiveBatch {
    pub keyword: String,
    pub items: Vec<SerpResultItem>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

impl From<SerpItem> for SerpResultItem {
    fn from(it: SerpItem) -> Self {
        Self {
            kind: it.kind,
            rank_absolute: it.rank_absolute,
            url: it.url,
            title: it.title,
            description: it.description,
            domain: it.domain,
        }
    }
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_live(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<SerpLiveBatch> {
    let estimated_usd = cost::estimate(&CostAction::Serp {
        count: 1,
        mode: Mode::Live,
        depth,
        extra_params: 0,
    });

    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::SERP_GOOGLE_ORGANIC_LIVE,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .serp_google_organic_live(&keyword, location_code, &language_code, depth)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;

    Ok(SerpLiveBatch {
        keyword: resp.keyword,
        items: resp.items.into_iter().map(SerpResultItem::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TaskBatchId {
    pub batch_id: String,
    pub task_count: u32,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TaskBatchStatus {
    pub batch_id: String,
    pub tasks: Vec<crate::store::serp_tasks::SerpTask>,
    pub results: std::collections::HashMap<String, Vec<crate::store::serp_results::StoredSerpItem>>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_task_create(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<TaskBatchId> {
    let cleaned: Vec<String> = keywords
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty())
        .collect();

    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    if cleaned.len() > 100 {
        return Err(AppError::Validation(
            "task_create accepts at most 100 keywords per batch".into(),
        ));
    }

    let estimated_usd = cost::estimate(&CostAction::Serp {
        count: cleaned.len() as u32,
        mode: Mode::Standard,
        depth,
        extra_params: 0,
    });

    let resp = state
        .api
        .serp_google_organic_task_post(&cleaned, location_code, &language_code, depth)
        .await?;

    // Millisecond precision so two batches submitted in the same second
    // do not collide on batch_id (the primary group key in serp_tasks).
    let batch_id = format!(
        "batch-{}",
        chrono::Utc::now().format("%Y%m%dT%H%M%S%.3fZ")
    );

    let store = state.store.clone();
    let task_ids = resp.task_ids.clone();
    let api_cost = resp.cost;
    let lang = language_code.clone();
    let kws = cleaned.clone();
    let bid = batch_id.clone();
    let request_size = cleaned.len() as i64;

    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| {
            // Wrap the insert_pending loop + ledger row in one transaction:
            // DuckDB autocommits per-statement otherwise, which is slow and
            // leaves a window where some tasks are persisted but the ledger
            // row is missing if the process dies mid-batch.
            let tx = c.transaction()?;
            {
                let mut insert_task = tx.prepare(
                    "INSERT INTO serp_tasks
                        (task_id, batch_id, keyword, location_code, language_code, depth,
                         status, poll_attempts)
                     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0)
                     ON CONFLICT (task_id) DO NOTHING",
                )?;
                for (idx, task_id) in task_ids.iter().enumerate() {
                    if let Some(kw) = kws.get(idx) {
                        insert_task.execute(duckdb::params![
                            task_id,
                            &bid,
                            kw,
                            location_code as i64,
                            &lang,
                            depth as i64,
                        ])?;
                    }
                }
            }
            tx.execute(
                "INSERT INTO api_calls
                    (endpoint, mode, cost_usd, estimated_usd, request_size,
                     response_status, duration_ms, task_id, error)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                duckdb::params![
                    endpoints::SERP_GOOGLE_ORGANIC_TASK_POST,
                    Mode::Standard.as_str(),
                    api_cost,
                    Some(estimated_usd),
                    Some(request_size),
                    Some(20000_i64),
                    None::<i64>,
                    None::<&str>,
                    None::<&str>,
                ],
            )?;
            tx.commit()?;
            Ok(())
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    Ok(TaskBatchId {
        batch_id,
        task_count: resp.task_ids.len() as u32,
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_task_status(
    state: State<'_, AppState>,
    batch_id: String,
) -> Result<TaskBatchStatus> {
    let store = state.store.clone();
    let bid = batch_id.clone();
    let (tasks, results) = task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| {
            let tasks = crate::store::serp_tasks::list_batch(c, &bid)?;
            // Single JOIN-backed query for every result row in this batch,
            // grouped in Rust afterward. Was N+1: one list_for_task per task.
            let all_items = crate::store::serp_results::list_for_batch(c, &bid)?;
            let mut results: std::collections::HashMap<String, Vec<_>> =
                std::collections::HashMap::new();
            for item in all_items {
                results.entry(item.task_id.clone()).or_default().push(item);
            }
            Ok((tasks, results))
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    Ok(TaskBatchStatus { batch_id, tasks, results })
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_task_recent_batches(
    state: State<'_, AppState>,
    limit: u32,
) -> Result<Vec<crate::store::serp_tasks::BatchSummary>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| crate::store::serp_tasks::list_recent_batches(c, limit))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

// ---------- SERP Ads / News / Maps live ----------

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_ads_live(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<SerpLiveBatch> {
    let estimated_usd = cost::estimate(&CostAction::Serp {
        count: 1,
        mode: Mode::Live,
        depth,
        extra_params: 0,
    });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::SERP_GOOGLE_ADS_LIVE,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .serp_google_ads_live(&keyword, location_code, &language_code, depth)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(SerpLiveBatch {
        keyword: resp.keyword,
        items: resp.items.into_iter().map(SerpResultItem::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_news_live(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<SerpLiveBatch> {
    let estimated_usd = cost::estimate(&CostAction::Serp {
        count: 1,
        mode: Mode::Live,
        depth,
        extra_params: 0,
    });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::SERP_GOOGLE_NEWS_LIVE,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .serp_google_news_live(&keyword, location_code, &language_code, depth)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(SerpLiveBatch {
        keyword: resp.keyword,
        items: resp.items.into_iter().map(SerpResultItem::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct MapsResultItem {
    pub kind: String,
    pub rank_absolute: Option<i32>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub domain: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub rating: Option<f64>,
    pub rating_count: Option<i64>,
    pub place_id: Option<String>,
    pub category: Option<String>,
}

impl From<MapsItem> for MapsResultItem {
    fn from(it: MapsItem) -> Self {
        Self {
            kind: it.kind,
            rank_absolute: it.rank_absolute,
            title: it.title,
            url: it.url,
            domain: it.domain,
            address: it.address,
            phone: it.phone,
            rating: it.rating,
            rating_count: it.rating_count,
            place_id: it.place_id,
            category: it.category,
        }
    }
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct MapsLiveBatch {
    pub keyword: String,
    pub items: Vec<MapsResultItem>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_maps_live(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<MapsLiveBatch> {
    let estimated_usd = cost::estimate(&CostAction::Serp {
        count: 1,
        mode: Mode::Live,
        depth,
        extra_params: 0,
    });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::SERP_GOOGLE_MAPS_LIVE,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .serp_google_maps_live(&keyword, location_code, &language_code, depth)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(MapsLiveBatch {
        keyword: resp.keyword,
        items: resp.items.into_iter().map(MapsResultItem::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

// ---------- Autocomplete + AI Overview ----------

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AutocompleteSuggestion {
    pub suggestion: Option<String>,
    pub relevance: Option<i64>,
    pub rank_absolute: Option<i32>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AutocompleteView {
    pub keyword: String,
    pub items: Vec<AutocompleteSuggestion>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_autocomplete(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
) -> Result<AutocompleteView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::SerpAutocomplete);
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::SERP_GOOGLE_AUTOCOMPLETE,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .serp_google_autocomplete_live(&kw, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(AutocompleteView {
        keyword: resp.keyword,
        items: resp
            .items
            .into_iter()
            .map(|it| AutocompleteSuggestion {
                suggestion: it.suggestion,
                relevance: it.relevance,
                rank_absolute: it.rank_absolute,
            })
            .collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AiOverviewView {
    pub keyword: String,
    /// Raw item; UI extracts text + references. Null when no AI Overview
    /// exists for the keyword (DataForSEO returns success + null result).
    pub item: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn serp_ai_overview(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
) -> Result<AiOverviewView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::SerpAiOverview);
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::SERP_GOOGLE_AI_OVERVIEW,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .serp_google_ai_overview_live(&kw, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(AiOverviewView {
        keyword: resp.keyword,
        item: resp.item,
        cost_usd: resp.cost,
        estimated_usd,
    })
}
