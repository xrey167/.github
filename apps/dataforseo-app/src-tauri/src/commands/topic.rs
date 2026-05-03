//! Topic Research / Content Brief — pure orchestration on top of
//! existing endpoints. No new DataForSEO endpoint, just a smart
//! recipe:
//!
//! 1. labs_keyword_suggestions(seed) → related keywords + KD/volume
//! 2. serp_google_organic_live(seed, depth=10) → top SERP results
//! 3. on_page_instant_pages_live(top_3_urls) in parallel →
//!    word counts, H2 headings
//!
//! Aggregates into a TopicBriefView the UI renders as a content brief
//! ("target N words", "include H2s like…", related keywords table,
//! top competitor URLs).
//!
//! Cached as a single unit; cache hits return $0.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::State;
use ts_rs::TS;

use crate::commands::cached::{self, CachedOutcome};
use crate::domain::cache;
use crate::domain::cost::{self, CostAction};
use crate::domain::endpoints;
use crate::errors::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BriefRelatedKeyword {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub keyword_difficulty: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BriefTopResult {
    pub rank: i32,
    pub url: String,
    pub domain: Option<String>,
    pub title: Option<String>,
    /// Word count from Instant Pages (only fetched for top 3 results).
    pub word_count: Option<i32>,
    /// H2 headings from Instant Pages (top 3 only).
    pub headings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TopicBriefView {
    pub seed: String,
    /// Median word count across the top 3 results that were audited.
    pub recommended_word_count: Option<i32>,
    pub min_word_count: Option<i32>,
    pub max_word_count: Option<i32>,
    /// H2/H3 headings that appeared in 2+ of the audited top results
    /// — signals what topics the SERP expects you to cover.
    pub common_headings: Vec<String>,
    /// Up to 20 related keywords with volume + KD.
    pub related_keywords: Vec<BriefRelatedKeyword>,
    /// Top 10 SERP results, with metrics for the top 3.
    pub top_results: Vec<BriefTopResult>,
    /// Sum of search volume across the related keyword set.
    pub total_volume_potential: i64,
    /// Average KD across the related keyword set (NaN-safe; 0 if empty).
    pub avg_difficulty: f64,
    pub cost_usd: f64,
    pub estimated_usd: f64,
    #[serde(default)]
    pub from_cache: bool,
    #[serde(default)]
    pub fetched_at: Option<String>,
}

const TOP_RESULTS_TO_AUDIT: usize = 3;
const RELATED_KEYWORDS_LIMIT: u32 = 20;
const SERP_DEPTH: u32 = 10;

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn topic_research(
    state: State<'_, AppState>,
    seed: String,
    location_code: u32,
    language_code: String,
    use_cache: bool,
) -> Result<TopicBriefView> {
    let seed = seed.trim().to_owned();
    if seed.is_empty() {
        return Err(AppError::Validation("seed required".into()));
    }
    let estimated_usd = cost::estimate(&CostAction::TopicResearch);
    let endpoint = endpoints::TOPIC_RESEARCH;
    let cache_params = serde_json::json!({
        "seed": &seed,
        "location_code": location_code,
        "language_code": &language_code,
    });

    if let CachedOutcome::Hit { mut view, fetched_at } = cached::lookup::<TopicBriefView>(
        state.store.clone(), endpoint, &cache_params, cache::ttl_medium(), use_cache,
    ).await? {
        view.from_cache = true;
        view.fetched_at = Some(fetched_at);
        view.cost_usd = 0.0;
        view.estimated_usd = estimated_usd;
        return Ok(view);
    }

    let api = state.api.clone();
    // Step 1: keyword suggestions (related keywords with KD/volume)
    let suggestions_fut = {
        let api = api.clone();
        let seed = seed.clone();
        let lang = language_code.clone();
        async move {
            api.labs_keyword_suggestions(&seed, location_code, &lang, RELATED_KEYWORDS_LIMIT)
                .await
        }
    };
    // Step 2: SERP organic top 10
    let serp_fut = {
        let api = api.clone();
        let seed = seed.clone();
        let lang = language_code.clone();
        async move {
            api.serp_google_organic_live(&seed, location_code, &lang, SERP_DEPTH)
                .await
        }
    };
    let (suggestions, serp) = tokio::try_join!(suggestions_fut, serp_fut)?;

    // Build the SERP results list — keep only `organic` items and the
    // first 10 for stability. SERP responses include featured snippets,
    // PAA, etc. that shouldn't count as "competitors" to audit.
    let mut top_results: Vec<BriefTopResult> = Vec::new();
    for item in serp.items.iter().filter(|i| i.kind == "organic").take(10) {
        if let Some(url) = &item.url {
            top_results.push(BriefTopResult {
                rank: item.rank_absolute.unwrap_or(top_results.len() as i32 + 1),
                url: url.clone(),
                domain: item.domain.clone(),
                title: item.title.clone(),
                word_count: None,
                headings: Vec::new(),
            });
        }
    }

    // Step 3: Instant Pages for the top 3 organic URLs (in parallel).
    // Failures are per-URL and don't fail the brief — we just leave
    // word_count/headings empty for that row.
    let urls_to_audit: Vec<String> = top_results
        .iter()
        .take(TOP_RESULTS_TO_AUDIT)
        .map(|r| r.url.clone())
        .collect();
    let mut audit_calls = Vec::new();
    for url in &urls_to_audit {
        let api = api.clone();
        let url = url.clone();
        audit_calls.push(tokio::spawn(async move {
            api.on_page_instant_pages_live(&url, false, false).await
        }));
    }
    let mut audit_total_cost = 0.0;
    for (idx, handle) in audit_calls.into_iter().enumerate() {
        match handle.await {
            Ok(Ok(resp)) => {
                audit_total_cost += resp.cost;
                if let Some(item) = resp.items.as_array().and_then(|a| a.first()) {
                    let word_count = item
                        .pointer("/content/plain_text_word_count")
                        .and_then(|v| v.as_i64())
                        .map(|n| n as i32);
                    let mut headings: Vec<String> = item
                        .pointer("/meta/htags/h2")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_owned()))
                                .collect()
                        })
                        .unwrap_or_default();
                    // Also pull H3s — gives a richer outline.
                    if let Some(h3) = item
                        .pointer("/meta/htags/h3")
                        .and_then(|v| v.as_array())
                    {
                        for v in h3 {
                            if let Some(s) = v.as_str() {
                                headings.push(s.to_owned());
                            }
                        }
                    }
                    if let Some(slot) = top_results.get_mut(idx) {
                        slot.word_count = word_count;
                        slot.headings = headings;
                    }
                }
            }
            Ok(Err(e)) => {
                tracing::warn!(url = %urls_to_audit[idx], error = %e, "instant_pages failed in topic_research");
            }
            Err(e) => {
                tracing::warn!(error = %e, "instant_pages join failed");
            }
        }
    }

    // Compute headings that appear in 2+ of the audited top results
    // (case-insensitive collapse, then return the first-seen casing).
    let mut heading_counts: HashMap<String, (u32, String)> = HashMap::new();
    for r in top_results.iter().take(TOP_RESULTS_TO_AUDIT) {
        let mut seen_in_this = std::collections::HashSet::new();
        for h in &r.headings {
            let key = h.to_lowercase();
            if !seen_in_this.insert(key.clone()) {
                continue;
            }
            let entry = heading_counts.entry(key).or_insert((0, h.clone()));
            entry.0 += 1;
        }
    }
    let mut common_headings: Vec<(u32, String)> = heading_counts
        .into_values()
        .filter(|(count, _)| *count >= 2)
        .collect();
    common_headings.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.cmp(&b.1)));
    let common_headings: Vec<String> = common_headings.into_iter().map(|(_, h)| h).collect();

    // Word-count recommendations: median, min, max across the audited results
    let mut word_counts: Vec<i32> = top_results
        .iter()
        .take(TOP_RESULTS_TO_AUDIT)
        .filter_map(|r| r.word_count)
        .collect();
    word_counts.sort();
    let (recommended_word_count, min_word_count, max_word_count) = if word_counts.is_empty() {
        (None, None, None)
    } else {
        let mid = word_counts.len() / 2;
        (
            Some(word_counts[mid]),
            Some(*word_counts.first().unwrap()),
            Some(*word_counts.last().unwrap()),
        )
    };

    // Related-keyword aggregates
    let related_keywords: Vec<BriefRelatedKeyword> = suggestions
        .items
        .iter()
        .map(|kw| BriefRelatedKeyword {
            keyword: kw.keyword.clone(),
            search_volume: kw.search_volume,
            keyword_difficulty: kw.keyword_difficulty,
        })
        .collect();
    let total_volume_potential: i64 = related_keywords
        .iter()
        .filter_map(|k| k.search_volume)
        .sum();
    let kd_values: Vec<f64> = related_keywords
        .iter()
        .filter_map(|k| k.keyword_difficulty.map(|n| n as f64))
        .collect();
    let avg_difficulty = if kd_values.is_empty() {
        0.0
    } else {
        kd_values.iter().sum::<f64>() / kd_values.len() as f64
    };

    let total_cost = suggestions.cost + serp.cost + audit_total_cost;
    let view = TopicBriefView {
        seed: seed.clone(),
        recommended_word_count,
        min_word_count,
        max_word_count,
        common_headings,
        related_keywords,
        top_results,
        total_volume_potential,
        avg_difficulty,
        cost_usd: total_cost,
        estimated_usd,
        from_cache: false,
        fetched_at: None,
    };
    cached::store_view(state.store.clone(), endpoint, &cache_params, &view, total_cost).await?;
    Ok(view)
}
