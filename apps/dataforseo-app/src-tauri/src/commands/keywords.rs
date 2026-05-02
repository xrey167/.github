use std::collections::HashSet;

use chrono::Duration;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::keywords_data::SearchVolumeRequest;
use crate::api::labs::{
    CompetitorsDomainItem, DomainIntersectionItem, LabsKeywordItem, RankedKeywordItem,
    SerpCompetitorItem,
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
