use std::collections::HashSet;

use chrono::Duration;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::keywords_data::SearchVolumeRequest;
use crate::api::labs::{
    BulkSearchVolumeItem, CompetitorsDomainItem, DomainIntersectionItem, LabsKeywordItem,
    RankedKeywordItem, SerpCompetitorItem,
};
use crate::commands::cached::{self, CachedOutcome};
use crate::commands::ledger::run_with_ledger;
use crate::domain::cache;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store::keywords_cache::{self, KeywordVolume};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LabsKeyword {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub competition_index: Option<i32>,
    pub cpc: Option<f64>,
    pub keyword_difficulty: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LabsBatch {
    pub items: Vec<LabsKeyword>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
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
    use_cache: bool,
) -> Result<LabsBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsSuggestions { mode: Mode::Live });
    let endpoint = endpoints::LABS_KEYWORD_SUGGESTIONS;
    let cache_params = serde_json::json!({
        "seed": &seed,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<LabsBatch>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
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
    let view = LabsBatch {
        items: resp.items.into_iter().map(LabsKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_related(
    state: State<'_, AppState>,
    seed: String,
    location_code: u32,
    language_code: String,
    depth: u32,
    use_cache: bool,
) -> Result<LabsBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsRelated { depth, mode: Mode::Live });
    let endpoint = endpoints::LABS_RELATED_KEYWORDS;
    let cache_params = serde_json::json!({
        "seed": &seed,
        "location_code": location_code,
        "language_code": &language_code,
        "depth": depth,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<LabsBatch>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
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
    let view = LabsBatch {
        items: resp.items.into_iter().map(LabsKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keywords_for_domain(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<LabsBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsForDomain { mode: Mode::Live });
    let endpoint = endpoints::LABS_KEYWORDS_FOR_SITE;
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<LabsBatch>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
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
    let view = LabsBatch {
        items: resp.items.into_iter().map(LabsKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct RankedBatch {
    pub items: Vec<RankedKeyword>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
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
    use_cache: bool,
) -> Result<RankedBatch> {
    let estimated_usd = cost::estimate(&CostAction::KeywordsForDomain { mode: Mode::Live });
    let endpoint = endpoints::LABS_RANKED_KEYWORDS;
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<RankedBatch>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_volatile(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
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
    let view = RankedBatch {
        items: resp.items.into_iter().map(RankedKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Domain Rank Overview + Bulk Keyword Difficulty ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct DomainRankOverviewView {
    pub target: String,
    /// Raw items array from DataForSEO (one row per metrics shape:
    /// organic + paid). UI extracts known fields.
    pub items: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_domain_rank_overview(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<DomainRankOverviewView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsDomainRankOverview);
    let endpoint = endpoints::LABS_DOMAIN_RANK_OVERVIEW;
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<DomainRankOverviewView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_domain_rank_overview(&target_for_call, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = DomainRankOverviewView {
        target: target.clone(),
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BulkDifficultyItem {
    pub keyword: String,
    pub keyword_difficulty: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BulkDifficultyView {
    pub items: Vec<BulkDifficultyItem>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

const BULK_DIFFICULTY_MAX: usize = 1000;

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_bulk_keyword_difficulty(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<BulkDifficultyView> {
    // Same order-preserving dedup pattern as keywords_search_volume so
    // the table stays stable.
    let mut seen = HashSet::new();
    let mut cleaned: Vec<String> = keywords
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone()))
        .collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    if cleaned.len() > BULK_DIFFICULTY_MAX {
        cleaned.truncate(BULK_DIFFICULTY_MAX);
    }
    let estimated_usd = cost::estimate(&CostAction::LabsBulkKeywordDifficulty {
        count: cleaned.len() as u32,
    });
    let endpoint = endpoints::LABS_BULK_KEYWORD_DIFFICULTY;
    // Sort keywords inside the cache key so two calls that pass the same
    // set in different order get the same hash. Doesn't affect the API
    // call (which we still make in the user-supplied order).
    let mut sorted_keywords = cleaned.clone();
    sorted_keywords.sort();
    let cache_params = serde_json::json!({
        "keywords": sorted_keywords,
        "location_code": location_code,
        "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<BulkDifficultyView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_long(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let cleaned_for_call = cleaned.clone();
    let request_size = cleaned.len() as i64;
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        request_size,
        move || async move {
            let r = api
                .labs_bulk_keyword_difficulty(&cleaned_for_call, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = BulkDifficultyView {
        items: resp
            .items
            .into_iter()
            .map(|i| BulkDifficultyItem {
                keyword: i.keyword,
                keyword_difficulty: i.keyword_difficulty,
            })
            .collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Competitive Intelligence ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SerpCompetitor {
    pub domain: Option<String>,
    pub avg_position: Option<f64>,
    pub median_position: Option<f64>,
    pub rating: Option<f64>,
    pub etv: Option<f64>,
    pub count: Option<i64>,
}

impl From<SerpCompetitorItem> for SerpCompetitor {
    fn from(it: SerpCompetitorItem) -> Self {
        Self {
            domain: it.domain,
            avg_position: it.avg_position,
            median_position: it.median_position,
            rating: it.rating,
            etv: it.etv,
            count: it.count,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SerpCompetitorsView {
    pub keyword: String,
    pub items: Vec<SerpCompetitor>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_serp_competitors(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<SerpCompetitorsView> {
    let estimated_usd = cost::estimate(&CostAction::LabsSerpCompetitors);
    let endpoint = endpoints::LABS_SERP_COMPETITORS;
    let cache_params = serde_json::json!({
        "keyword": &keyword,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<SerpCompetitorsView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_serp_competitors(&keyword, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = SerpCompetitorsView {
        keyword: resp.keyword,
        items: resp.items.into_iter().map(SerpCompetitor::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct CompetitorDomain {
    pub domain: Option<String>,
    pub avg_position: Option<f64>,
    pub sum_position: Option<i64>,
    pub intersections: Option<i64>,
}

impl From<CompetitorsDomainItem> for CompetitorDomain {
    fn from(it: CompetitorsDomainItem) -> Self {
        Self {
            domain: it.domain,
            avg_position: it.avg_position,
            sum_position: it.sum_position,
            intersections: it.intersections,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct CompetitorsDomainView {
    pub target: String,
    pub items: Vec<CompetitorDomain>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_competitors_domain(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<CompetitorsDomainView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsCompetitorsDomain);
    let endpoint = endpoints::LABS_COMPETITORS_DOMAIN;
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<CompetitorsDomainView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_competitors_domain(&target_for_call, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = CompetitorsDomainView {
        target: target.clone(),
        items: resp.items.into_iter().map(CompetitorDomain::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct IntersectionKeyword {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub keyword_difficulty: Option<i32>,
    pub rank_first: Option<i32>,
    pub rank_second: Option<i32>,
    pub url_first: Option<String>,
    pub url_second: Option<String>,
}

impl From<DomainIntersectionItem> for IntersectionKeyword {
    fn from(it: DomainIntersectionItem) -> Self {
        Self {
            keyword: it.keyword,
            search_volume: it.search_volume,
            keyword_difficulty: it.keyword_difficulty,
            rank_first: it.rank_first,
            rank_second: it.rank_second,
            url_first: it.url_first,
            url_second: it.url_second,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct DomainIntersectionView {
    pub target1: String,
    pub target2: String,
    pub items: Vec<IntersectionKeyword>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_domain_intersection(
    state: State<'_, AppState>,
    target1: String,
    target2: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<DomainIntersectionView> {
    let target1 = target1.trim().to_owned();
    let target2 = target2.trim().to_owned();
    if target1.is_empty() || target2.is_empty() {
        return Err(AppError::Validation("both target1 and target2 required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsDomainIntersection);
    let endpoint = endpoints::LABS_DOMAIN_INTERSECTION;
    // Sort the pair so `(a,b)` and `(b,a)` share a cache key. The position
    // labels in the response (target1 vs target2) still match what the API
    // actually returned for the live call — we only normalize the hash.
    let mut pair = [target1.as_str(), target2.as_str()];
    pair.sort();
    let cache_params = serde_json::json!({
        "targets": pair,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<DomainIntersectionView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let t1 = target1.clone();
    let t2 = target2.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_domain_intersection(&t1, &t2, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = DomainIntersectionView {
        target1: target1.clone(),
        target2: target2.clone(),
        items: resp
            .items
            .into_iter()
            .map(IntersectionKeyword::from)
            .collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Labs Bulk Search Volume ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BulkVolumeItem {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<f64>,
    pub competition_level: Option<String>,
    pub cpc: Option<f64>,
}

impl From<BulkSearchVolumeItem> for BulkVolumeItem {
    fn from(it: BulkSearchVolumeItem) -> Self {
        Self {
            keyword: it.keyword,
            search_volume: it.search_volume,
            competition: it.competition,
            competition_level: it.competition_level,
            cpc: it.cpc,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BulkVolumeView {
    pub items: Vec<BulkVolumeItem>,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

const BULK_VOLUME_MAX: usize = 1000;

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_bulk_search_volume(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<BulkVolumeView> {
    let mut seen = HashSet::new();
    let mut cleaned: Vec<String> = keywords
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone()))
        .collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    if cleaned.len() > BULK_VOLUME_MAX {
        cleaned.truncate(BULK_VOLUME_MAX);
    }
    let estimated_usd = cost::estimate(&CostAction::LabsBulkSearchVolume {
        count: cleaned.len() as u32,
    });
    let endpoint = endpoints::LABS_BULK_SEARCH_VOLUME;
    let mut sorted_keywords = cleaned.clone();
    sorted_keywords.sort();
    let cache_params = serde_json::json!({
        "keywords": sorted_keywords,
        "location_code": location_code,
        "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<BulkVolumeView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_long(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let cleaned_for_call = cleaned.clone();
    let request_size = cleaned.len() as i64;
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        request_size,
        move || async move {
            let r = api
                .labs_bulk_search_volume(&cleaned_for_call, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = BulkVolumeView {
        items: resp.items.into_iter().map(BulkVolumeItem::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- True Keyword Gap ----------
//
// Orchestration on top of labs_ranked_keywords. Runs the call for both
// targets (re-using the response cache via the existing 1d TTL) and
// computes three sets in Rust so the UI doesn't have to ship two
// 1000-row payloads to the renderer just to set-difference them.

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct GapKeyword {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub keyword_difficulty: Option<i32>,
    pub cpc: Option<f64>,
    pub rank_yours: Option<i32>,
    pub rank_theirs: Option<i32>,
    /// "missing" = competitor ranks, you don't.
    /// "weak"    = both rank but competitor outranks you.
    /// "strong"  = both rank and you outrank competitor.
    /// "unique"  = you rank, competitor doesn't.
    pub bucket: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct KeywordGapView {
    pub yours: String,
    pub competitor: String,
    pub items: Vec<GapKeyword>,
    pub missing_count: u32,
    pub weak_count: u32,
    pub strong_count: u32,
    pub unique_count: u32,
    pub cost_usd: f64,
    pub estimated_usd: f64,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn keyword_gap(
    state: State<'_, AppState>,
    yours: String,
    competitor: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<KeywordGapView> {
    let yours = yours.trim().to_owned();
    let competitor = competitor.trim().to_owned();
    if yours.is_empty() || competitor.is_empty() {
        return Err(AppError::Validation("both yours and competitor required".into()));
    }
    // Two ranked_keywords calls — both go through their own cache (TTL 1d).
    // We don't add a third cache layer for the gap result itself because
    // the merge is cheap and cache hits on the underlying calls already
    // make this near-free.
    let your_ranked = inner_keywords_ranked(
        &state, yours.clone(), location_code, language_code.clone(), limit, use_cache,
    ).await?;
    let comp_ranked = inner_keywords_ranked(
        &state, competitor.clone(), location_code, language_code.clone(), limit, use_cache,
    ).await?;

    let mut your_map: std::collections::HashMap<String, &RankedKeyword> =
        std::collections::HashMap::with_capacity(your_ranked.items.len());
    for k in &your_ranked.items {
        your_map.insert(k.keyword.clone(), k);
    }
    let mut comp_map: std::collections::HashMap<String, &RankedKeyword> =
        std::collections::HashMap::with_capacity(comp_ranked.items.len());
    for k in &comp_ranked.items {
        comp_map.insert(k.keyword.clone(), k);
    }

    let mut items: Vec<GapKeyword> = Vec::new();
    let mut missing = 0u32;
    let mut weak = 0u32;
    let mut strong = 0u32;
    let mut unique = 0u32;

    // Walk competitor's set first — captures missing + weak/strong overlap.
    for (kw, c) in &comp_map {
        let y = your_map.get(kw);
        let bucket = match (y.and_then(|y| y.rank_absolute), c.rank_absolute) {
            (None, Some(_)) => { missing += 1; "missing" }
            (Some(yr), Some(cr)) if cr < yr => { weak += 1; "weak" }
            (Some(yr), Some(cr)) if yr < cr => { strong += 1; "strong" }
            _ => continue,
        };
        items.push(GapKeyword {
            keyword: kw.clone(),
            search_volume: c.search_volume.or_else(|| y.and_then(|y| y.search_volume)),
            keyword_difficulty: c.keyword_difficulty.or_else(|| y.and_then(|y| y.keyword_difficulty)),
            cpc: c.cpc.or_else(|| y.and_then(|y| y.cpc)),
            rank_yours: y.and_then(|y| y.rank_absolute),
            rank_theirs: c.rank_absolute,
            bucket: bucket.into(),
        });
    }
    // Then yours-only.
    for (kw, y) in &your_map {
        if comp_map.contains_key(kw) { continue; }
        unique += 1;
        items.push(GapKeyword {
            keyword: kw.clone(),
            search_volume: y.search_volume,
            keyword_difficulty: y.keyword_difficulty,
            cpc: y.cpc,
            rank_yours: y.rank_absolute,
            rank_theirs: None,
            bucket: "unique".into(),
        });
    }
    // Stable sort: by volume desc, then keyword asc.
    items.sort_by(|a, b| {
        b.search_volume.unwrap_or(0).cmp(&a.search_volume.unwrap_or(0))
            .then_with(|| a.keyword.cmp(&b.keyword))
    });

    // Cost is whatever the two underlying calls actually charged. If both
    // were cache hits, this is 0.0 and the user pays nothing for the gap.
    let total_cost = your_ranked.cost_usd + comp_ranked.cost_usd;
    let estimated = your_ranked.estimated_usd + comp_ranked.estimated_usd;
    Ok(KeywordGapView {
        yours,
        competitor,
        items,
        missing_count: missing,
        weak_count: weak,
        strong_count: strong,
        unique_count: unique,
        cost_usd: total_cost,
        estimated_usd: estimated,
    })
}

async fn inner_keywords_ranked(
    state: &State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<RankedBatch> {
    // Re-implements the keywords_ranked body inline to avoid round-tripping
    // through the Tauri command dispatcher. Identical caching semantics.
    let endpoint = endpoints::LABS_RANKED_KEYWORDS;
    let estimated_usd = cost::estimate(&CostAction::KeywordsForDomain { mode: Mode::Live });
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<RankedBatch>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_volatile(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
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
    let view = RankedBatch {
        items: resp.items.into_iter().map(RankedKeyword::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Labs Keyword Overview + Search Intent ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct KeywordOverviewView {
    pub keyword: String,
    /// Raw item — UI extracts the well-known fields. Shape is large
    /// enough that mirroring 30 typed fields would be high churn for
    /// little benefit; the page picks the slices it knows.
    pub item: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_keyword_overview(
    state: State<'_, AppState>,
    keyword: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<KeywordOverviewView> {
    let keyword = keyword.trim().to_owned();
    if keyword.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsKeywordOverview);
    let endpoint = endpoints::LABS_KEYWORD_OVERVIEW;
    let cache_params = serde_json::json!({
        "keyword": &keyword,
        "location_code": location_code,
        "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<KeywordOverviewView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let kw_for_call = keyword.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_keyword_overview(&kw_for_call, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = KeywordOverviewView {
        keyword: keyword.clone(),
        item: resp.item,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SearchIntentView {
    /// Raw items array — each item has `keyword` + `keyword_intent.label`
    /// (informational/commercial/navigational/transactional) +
    /// `secondary_keyword_intents` array.
    pub items: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_search_intent(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    language_code: String,
    use_cache: bool,
) -> Result<SearchIntentView> {
    let mut seen = HashSet::new();
    let cleaned: Vec<String> = keywords
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone()))
        .collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsSearchIntent);
    let endpoint = endpoints::LABS_SEARCH_INTENT;
    let mut sorted = cleaned.clone();
    sorted.sort();
    let cache_params = serde_json::json!({
        "keywords": sorted,
        "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<SearchIntentView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_long(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let cleaned_for_call = cleaned.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        cleaned.len() as i64,
        move || async move {
            let r = api
                .labs_search_intent(&cleaned_for_call, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = SearchIntentView {
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Google Trends Explore + Labs Categories For Domain ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TrendsView {
    pub keywords: Vec<String>,
    /// Raw items array — UI charts the `google_trends_graph` item and
    /// renders `google_trends_topics_list` / `google_trends_queries_list`
    /// if present.
    pub items: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn google_trends_explore(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    location_code: u32,
    language_code: String,
    date_from: Option<String>,
    date_to: Option<String>,
    use_cache: bool,
) -> Result<TrendsView> {
    let cleaned: Vec<String> = keywords
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty())
        .collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    if cleaned.len() > 5 {
        return Err(AppError::Validation("up to 5 keywords per Trends call".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::KeywordsTrends);
    let endpoint = endpoints::KEYWORDS_TRENDS_EXPLORE;
    let cache_params = serde_json::json!({
        "keywords": &cleaned,
        "location_code": location_code,
        "language_code": &language_code,
        "date_from": &date_from,
        "date_to": &date_to,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<TrendsView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let cleaned_for_call = cleaned.clone();
    let from_for_call = date_from.clone();
    let to_for_call = date_to.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        cleaned.len() as i64,
        move || async move {
            let r = api
                .google_trends_explore_live(
                    &cleaned_for_call,
                    location_code,
                    &language_code,
                    from_for_call.as_deref(),
                    to_for_call.as_deref(),
                )
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = TrendsView {
        keywords: cleaned,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct CategoriesForDomainView {
    pub target: String,
    pub items: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_categories_for_domain(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<CategoriesForDomainView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsCategoriesForDomain);
    let endpoint = endpoints::LABS_CATEGORIES_FOR_DOMAIN;
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<CategoriesForDomainView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_long(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .labs_categories_for_domain(&target_for_call, location_code, &language_code)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = CategoriesForDomainView {
        target: target.clone(),
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Google Ads Keywords-for-Site / Keywords-for-Keywords ----------

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn google_ads_keywords_for_site(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<KeywordVolumeBatch> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::GoogleAdsKeywordsExpansion);
    let endpoint = endpoints::KEYWORDS_FOR_SITE_GOOGLE_ADS;
    let cache_params = serde_json::json!({
        "target": &target,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if use_cache {
        if let CachedOutcome::Hit { mut view, fetched_at: _ } = cached::lookup::<KeywordVolumeBatch>(
            state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
        ).await? {
            view.cost_usd = 0.0;
            view.estimated_usd = estimated_usd;
            return Ok(view);
        }
    }
    let api = state.api.clone();
    let target_for_call = target.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .google_ads_keywords_for_site_live(&target_for_call, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let items: Vec<KeywordVolume> = resp
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
    let view = KeywordVolumeBatch {
        items,
        cache_hits: 0,
        fresh: 0,
        cost_usd: resp.cost,
        estimated_usd,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn google_ads_keywords_for_keywords(
    state: State<'_, AppState>,
    seeds: Vec<String>,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<KeywordVolumeBatch> {
    let mut seen = HashSet::new();
    let cleaned: Vec<String> = seeds
        .into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone()))
        .collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one seed required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::GoogleAdsKeywordsExpansion);
    let endpoint = endpoints::KEYWORDS_FOR_KEYWORDS_GOOGLE_ADS;
    let mut sorted_seeds = cleaned.clone();
    sorted_seeds.sort();
    let cache_params = serde_json::json!({
        "seeds": sorted_seeds,
        "location_code": location_code,
        "language_code": &language_code,
        "limit": limit,
    });
    if use_cache {
        if let CachedOutcome::Hit { mut view, fetched_at: _ } = cached::lookup::<KeywordVolumeBatch>(
            state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
        ).await? {
            view.cost_usd = 0.0;
            view.estimated_usd = estimated_usd;
            return Ok(view);
        }
    }
    let api = state.api.clone();
    let seeds_for_call = cleaned.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        cleaned.len() as i64,
        move || async move {
            let r = api
                .google_ads_keywords_for_keywords_live(&seeds_for_call, location_code, &language_code, limit)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let items: Vec<KeywordVolume> = resp
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
    let view = KeywordVolumeBatch {
        items,
        cache_hits: 0,
        fresh: 0,
        cost_usd: resp.cost,
        estimated_usd,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Phase A.2: Labs Historical / Subdomains / Relevant / PageIntersection / KeywordIdeas / TopSearches / CategoriesForKeywords ----------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LabsRawView {
    /// Raw items array — UI extracts the well-known fields per endpoint.
    pub items: serde_json::Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

async fn labs_flat_command<F, Fut>(
    state: &State<'_, AppState>,
    endpoint: &'static str,
    cache_params: serde_json::Value,
    use_cache: bool,
    op: F,
) -> Result<LabsRawView>
where
    F: FnOnce(std::sync::Arc<crate::api::client::ApiClient>) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<crate::api::labs::LabsRawValueResponse>> + Send,
{
    let estimated_usd = cost::estimate(&CostAction::LabsFlat);
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<LabsRawView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = op(api).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = LabsRawView {
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_historical_rank_overview(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<LabsRawView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let cache_params = serde_json::json!({
        "target": &target, "location_code": location_code, "language_code": &language_code,
    });
    let lang = language_code.clone();
    labs_flat_command(&state, endpoints::LABS_HISTORICAL_RANK_OVERVIEW, cache_params, use_cache, move |api| async move {
        api.labs_historical_rank_overview(&target, location_code, &lang).await
    }).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_subdomains(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<LabsRawView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let cache_params = serde_json::json!({
        "target": &target, "location_code": location_code, "language_code": &language_code,
    });
    let lang = language_code.clone();
    labs_flat_command(&state, endpoints::LABS_SUBDOMAINS, cache_params, use_cache, move |api| async move {
        api.labs_subdomains(&target, location_code, &lang).await
    }).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_relevant_pages(
    state: State<'_, AppState>,
    target: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<LabsRawView> {
    let target = target.trim().to_owned();
    if target.is_empty() {
        return Err(AppError::Validation("target required".into()));
    }
    let cache_params = serde_json::json!({
        "target": &target, "location_code": location_code, "language_code": &language_code,
    });
    let lang = language_code.clone();
    labs_flat_command(&state, endpoints::LABS_RELEVANT_PAGES, cache_params, use_cache, move |api| async move {
        api.labs_relevant_pages(&target, location_code, &lang).await
    }).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_page_intersection(
    state: State<'_, AppState>,
    pages: Vec<String>,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<LabsRawView> {
    let pages: Vec<String> = pages.into_iter().map(|p| p.trim().to_owned()).filter(|p| !p.is_empty()).collect();
    if pages.len() < 2 {
        return Err(AppError::Validation("at least 2 pages required".into()));
    }
    let mut sorted = pages.clone();
    sorted.sort();
    let cache_params = serde_json::json!({
        "pages": sorted, "location_code": location_code, "language_code": &language_code, "limit": limit,
    });
    let pages_for_call = pages.clone();
    let lang = language_code.clone();
    labs_flat_command(&state, endpoints::LABS_PAGE_INTERSECTION, cache_params, use_cache, move |api| async move {
        api.labs_page_intersection(&pages_for_call, location_code, &lang, limit).await
    }).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_keyword_ideas(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<LabsRawView> {
    let mut seen = HashSet::new();
    let cleaned: Vec<String> = keywords.into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone())).collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    let mut sorted = cleaned.clone();
    sorted.sort();
    let cache_params = serde_json::json!({
        "keywords": sorted, "location_code": location_code, "language_code": &language_code, "limit": limit,
    });
    let kw_for_call = cleaned.clone();
    let lang = language_code.clone();
    labs_flat_command(&state, endpoints::LABS_KEYWORD_IDEAS, cache_params, use_cache, move |api| async move {
        api.labs_keyword_ideas(&kw_for_call, location_code, &lang, limit).await
    }).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_top_searches(
    state: State<'_, AppState>,
    location_code: u32,
    language_code: String,
    limit: u32,
    use_cache: bool,
) -> Result<LabsRawView> {
    let cache_params = serde_json::json!({
        "location_code": location_code, "language_code": &language_code, "limit": limit,
    });
    let lang = language_code.clone();
    labs_flat_command(&state, endpoints::LABS_TOP_SEARCHES, cache_params, use_cache, move |api| async move {
        api.labs_top_searches(location_code, &lang, limit).await
    }).await
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn labs_categories_for_keywords(
    state: State<'_, AppState>,
    keywords: Vec<String>,
    language_code: String,
    use_cache: bool,
) -> Result<LabsRawView> {
    let mut seen = HashSet::new();
    let cleaned: Vec<String> = keywords.into_iter()
        .map(|k| k.trim().to_owned())
        .filter(|k| !k.is_empty() && seen.insert(k.clone())).collect();
    if cleaned.is_empty() {
        return Err(AppError::Validation("at least one keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::LabsCategoriesForKeywords);
    let endpoint = endpoints::LABS_CATEGORIES_FOR_KEYWORDS;
    let mut sorted = cleaned.clone();
    sorted.sort();
    let cache_params = serde_json::json!({
        "keywords": sorted, "language_code": &language_code,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<LabsRawView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_long(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let kw_for_call = cleaned.clone();
    let lang = language_code.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        cleaned.len() as i64,
        move || async move {
            let r = api.labs_categories_for_keywords(&kw_for_call, &lang).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = LabsRawView {
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}
