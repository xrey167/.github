//! Brand Monitoring commands. Wraps the Content Analysis API:
//! search (find mentions), summary (aggregate stats), and per-mention
//! sentiment_analysis. All three cache through response_cache so the
//! Brand page can be re-opened without re-charging.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use ts_rs::TS;

use crate::commands::cached::{self, CachedOutcome};
use crate::commands::ledger::run_with_ledger;
use crate::domain::cache;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::domain::types::Mode;
use crate::errors::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BrandSearchView {
    pub keyword: String,
    pub items: Value,
    pub items_count: i64,
    pub total_count: i64,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn brand_search(
    state: State<'_, AppState>,
    keyword: String,
    limit: u32,
    positive_keywords: Vec<String>,
    negative_keywords: Vec<String>,
    use_cache: bool,
) -> Result<BrandSearchView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::ContentAnalysisSearch { rows: limit });
    let endpoint = endpoints::CONTENT_ANALYSIS_SEARCH;
    // Sort positive/negative keywords for stable cache keys regardless
    // of the order the user typed them.
    let mut pk = positive_keywords.clone();
    pk.sort();
    let mut nk = negative_keywords.clone();
    nk.sort();
    let cache_params = serde_json::json!({
        "keyword": &kw,
        "limit": limit,
        "positive_keywords": pk,
        "negative_keywords": nk,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<BrandSearchView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let kw_for_call = kw.clone();
    let pk_for_call = positive_keywords.clone();
    let nk_for_call = negative_keywords.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let r = api
                .content_analysis_search_live(&kw_for_call, limit, &pk_for_call, &nk_for_call)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = BrandSearchView {
        keyword: kw,
        items: resp.items,
        items_count: resp.items_count,
        total_count: resp.total_count,
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
pub struct BrandSummaryView {
    pub keyword: String,
    pub result: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn brand_summary(
    state: State<'_, AppState>,
    keyword: String,
    positive_keywords: Vec<String>,
    negative_keywords: Vec<String>,
    use_cache: bool,
) -> Result<BrandSummaryView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::ContentAnalysisSummary);
    let endpoint = endpoints::CONTENT_ANALYSIS_SUMMARY;
    let mut pk = positive_keywords.clone();
    pk.sort();
    let mut nk = negative_keywords.clone();
    nk.sort();
    let cache_params = serde_json::json!({
        "keyword": &kw,
        "positive_keywords": pk,
        "negative_keywords": nk,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<BrandSummaryView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let kw_for_call = kw.clone();
    let pk_for_call = positive_keywords.clone();
    let nk_for_call = negative_keywords.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .content_analysis_summary_live(&kw_for_call, &pk_for_call, &nk_for_call)
                .await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = BrandSummaryView {
        keyword: kw,
        result: resp.result,
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
pub struct BrandSentimentView {
    pub keyword: String,
    pub items: Value,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn brand_sentiment(
    state: State<'_, AppState>,
    keyword: String,
    limit: u32,
    use_cache: bool,
) -> Result<BrandSentimentView> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::ContentAnalysisSentiment { rows: limit });
    let endpoint = endpoints::CONTENT_ANALYSIS_SENTIMENT;
    let cache_params = serde_json::json!({
        "keyword": &kw,
        "limit": limit,
    });
    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<BrandSentimentView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }
    let api = state.api.clone();
    let kw_for_call = kw.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        limit as i64,
        move || async move {
            let r = api.content_analysis_sentiment_live(&kw_for_call, limit).await?;
            let cost = r.cost;
            Ok((r, cost))
        },
    )
    .await?;
    let view = BrandSentimentView {
        keyword: kw,
        items: resp.items,
        cost_usd: resp.cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, resp.cost).await?;
    Ok(view)
}

// ---------- Phase A: Content Analysis Rating / Phrase Trends / Category Trends ----------

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn brand_rating_distribution(
    state: State<'_, AppState>,
    keyword: String,
    use_cache: bool,
) -> Result<Value> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::ContentAnalysisRatingDistribution);
    let endpoint = endpoints::CONTENT_ANALYSIS_RATING_DISTRIBUTION;
    let cache_params = serde_json::json!({ "keyword": &kw });
    if use_cache {
        if let CachedOutcome::Hit { view, .. } = cached::lookup::<Value>(
            state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
        ).await? {
            return Ok(view);
        }
    }
    let api = state.api.clone();
    let kw_for_call = kw.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.content_analysis_rating_distribution_live(&kw_for_call).await?;
            Ok((r, estimated_usd))
        },
    )
    .await?;
    cached::store_view(state.store.clone(), endpoint, &cache_params, &resp, estimated_usd).await?;
    Ok(resp)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn brand_phrase_trends(
    state: State<'_, AppState>,
    keyword: String,
    date_from: Option<String>,
    date_to: Option<String>,
    use_cache: bool,
) -> Result<Value> {
    let kw = keyword.trim().to_owned();
    if kw.is_empty() {
        return Err(AppError::Validation("keyword required".into()));
    }
    // Phrase trends bills per row but we don't know the row count up-front;
    // estimate at 30 rows (≈ a year of weekly buckets). Real bill comes
    // back via the API and lands in the ledger.
    let estimated_usd = cost::estimate(&CostAction::ContentAnalysisPhraseTrends { rows: 30 });
    let endpoint = endpoints::CONTENT_ANALYSIS_PHRASE_TRENDS;
    let cache_params = serde_json::json!({
        "keyword": &kw, "date_from": &date_from, "date_to": &date_to,
    });
    if use_cache {
        if let CachedOutcome::Hit { view, .. } = cached::lookup::<Value>(
            state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
        ).await? {
            return Ok(view);
        }
    }
    let api = state.api.clone();
    let kw_for_call = kw.clone();
    let from_for_call = date_from.clone();
    let to_for_call = date_to.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api
                .content_analysis_phrase_trends_live(
                    &kw_for_call,
                    from_for_call.as_deref(),
                    to_for_call.as_deref(),
                )
                .await?;
            Ok((r, estimated_usd))
        },
    )
    .await?;
    cached::store_view(state.store.clone(), endpoint, &cache_params, &resp, estimated_usd).await?;
    Ok(resp)
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn brand_category_trends(
    state: State<'_, AppState>,
    category_code: i64,
    use_cache: bool,
) -> Result<Value> {
    let estimated_usd = cost::estimate(&CostAction::ContentAnalysisCategoryTrends { rows: 30 });
    let endpoint = endpoints::CONTENT_ANALYSIS_CATEGORY_TRENDS;
    let cache_params = serde_json::json!({ "category_code": category_code });
    if use_cache {
        if let CachedOutcome::Hit { view, .. } = cached::lookup::<Value>(
            state.store.clone(), endpoint, &cache_params, cache::ttl_short(), use_cache,
        ).await? {
            return Ok(view);
        }
    }
    let api = state.api.clone();
    let resp = run_with_ledger(
        state.store.clone(),
        endpoint,
        Mode::Live,
        estimated_usd,
        1,
        move || async move {
            let r = api.content_analysis_category_trends_live(category_code).await?;
            Ok((r, estimated_usd))
        },
    )
    .await?;
    cached::store_view(state.store.clone(), endpoint, &cache_params, &resp, estimated_usd).await?;
    Ok(resp)
}
