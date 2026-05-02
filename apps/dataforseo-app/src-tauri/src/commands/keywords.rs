use std::collections::HashSet;

use chrono::Duration;
use serde::Serialize;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::keywords_data::SearchVolumeRequest;
use crate::api::labs::{LabsKeywordItem, RankedKeywordItem};
use crate::commands::ledger::run_with_ledger;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::keywords_cache::{self, KeywordVolume};

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct KeywordVolumeBatch {
    pub items: Vec<KeywordVolume>,
    pub cache_hits: u32,
    pub fresh: u32,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

const CACHE_TTL_DAYS: i64 = 30;

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_search_volume(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<KeywordVolumeBatch> {
    // Order-preserving dedup so the result table stays stable across runs
    // and matches the user's input order for keywords with equal volume.
    let mut seen = HashSet::new();
    let cleaned: Vec<String> = keywords
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone()))
        .collect();

    let estimated_usd = cost::estimate(&CostAction::KeywordsSearchVolume {
        count: cleaned.len() as u32,
        mode: Mode::Live,
    });

    let store = state.store.clone();
    let cache_keywords = cleaned.clone();
    let lang_for_cache = language_code.clone();
    let cached = if use_cache {
        task::spawn_blocking(move || {
            store.with_conn(|c| {
                keywords_cache::get_fresh(
                    c,
                    &cache_keywords,
                    location_code,
                    &lang_for_cache,
                    Duration::days(CACHE_TTL_DAYS),
                )
            })
        })
        .await
        .map_err(|e| AppError::Internal(e.to_string()))??
    } else {
        Default::default()
    };

    let misses: Vec<String> = cleaned
        .iter()
        .filter(|k| !cached.contains_key(*k))
        .cloned()
        .collect();

    let mut fresh_rows: Vec<KeywordVolume> = Vec::new();
    let mut api_cost = 0.0;

    if !misses.is_empty() {
        let api = state.api.clone();
        let misses_for_call = misses.clone();
        let lang_for_call = language_code.clone();
        let resp = run_with_ledger(
            state.store.clone(),
            endpoints::KEYWORDS_SEARCH_VOLUME,
            Mode::Live,
            estimated_usd,
            misses.len() as i64,
            move || async move {
                let r = api
                    .google_ads_search_volume_live(SearchVolumeRequest {
                        keywords: &misses_for_call,
                        location_code,
                        language_code: &lang_for_call,
                    })
                    .await?;
                let cost = r.cost;
                Ok((r, cost))
            },
        )
        .await?;

        api_cost = resp.cost;

        fresh_rows = resp
            .items
            .into_iter()
            .map(|item| KeywordVolume {
                keyword: item.keyword,
                search_volume: item.search_volume,
                competition: item.competition,
                competition_index: item.competition_index,
                cpc: item.cpc,
                low_top_of_page_bid: item.low_top_of_page_bid,
                high_top_of_page_bid: item.high_top_of_page_bid,
                monthly_searches: item.monthly_searches,
                from_cache: false,
            })
            .collect();

        let store = state.store.clone();
        let lang_for_write = language_code.clone();
        let to_persist = fresh_rows.clone();
        task::spawn_blocking(move || -> Result<()> {
            store.with_conn(|c| {
                keywords_cache::put_batch(c, location_code, &lang_for_write, &to_persist)
            })
        })
        .await
        .map_err(|e| AppError::Internal(e.to_string()))??;
    }

    let mut items: Vec<KeywordVolume> = cached.into_values().collect();
    let cache_hits = items.len() as u32;
    let fresh = fresh_rows.len() as u32;
    items.extend(fresh_rows);
    items.sort_by(|a, b| {
        b.search_volume
            .unwrap_or(0)
            .cmp(&a.search_volume.unwrap_or(0))
    });

    Ok(KeywordVolumeBatch {
        items,
        cache_hits,
        fresh,
        cost_usd: api_cost,
        estimated_usd,
    })
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LabsKeyword {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub competition_index: Option<i32>,
    pub cpc: Option<f64>,
    pub keyword_difficulty: Option<i32>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LabsBatch {
    pub items: Vec<LabsKeyword>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

impl From<LabsKeywordItem> for LabsKeyword {
    fn from(it: LabsKeywordItem) -> Self {
        Self {
            keyword: it.keyword,
            search_volume: it.search_volume,
            competition: it.competition,
            competition_index: it.competition_index,
            cpc: it.cpc,
            keyword_difficulty: it.keyword_difficulty,
        }
    }
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_suggestions(
    state: State<'_, AppState>,
    seed: String,
    location_code: u32,
    language_code: String,
    limit: u32,
) -> Result<LabsBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsSuggestions { mode: Mode::Live });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::LABS_KEYWORD_SUGGESTIONS,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_keyword_suggestions(&seed, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(LabsBatch {
        items: resp.items.into_iter().map(LabsKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_related(
    state: State<'_, AppState>,
    seed: String,
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<LabsBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsRelated { depth, mode: Mode::Live });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::LABS_RELATED_KEYWORDS,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_related_keywords(&seed, location_code, &language_code, depth)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(LabsBatch {
        items: resp.items.into_iter().map(LabsKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_for_domain(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    limit: u32,
) -> Result<LabsBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsForDomain { mode: Mode::Live });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::LABS_KEYWORDS_FOR_SITE,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_keywords_for_site(&target, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(LabsBatch {
        items: resp.items.into_iter().map(LabsKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct RankedKeyword {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub cpc: Option<f64>,
    pub keyword_difficulty: Option<i32>,
    pub rank_absolute: Option<i32>,
    pub serp_url: Option<String>,
    pub etv: Option<f64>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct RankedBatch {
    pub items: Vec<RankedKeyword>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

impl From<RankedKeywordItem> for RankedKeyword {
    fn from(it: RankedKeywordItem) -> Self {
        Self {
            keyword: it.keyword,
            search_volume: it.search_volume,
            competition: it.competition,
            cpc: it.cpc,
            keyword_difficulty: it.keyword_difficulty,
            rank_absolute: it.rank_absolute,
            serp_url: it.serp_url,
            etv: it.etv,
        }
    }
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_ranked(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    limit: u32,
) -> Result<RankedBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsForDomain { mode: Mode::Live });
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoints::LABS_RANKED_KEYWORDS,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_ranked_keywords(&target, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    Ok(RankedBatch {
        items: resp.items.into_iter().map(RankedKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}
