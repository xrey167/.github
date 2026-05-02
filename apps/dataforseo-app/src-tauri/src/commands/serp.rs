use serde::Serialize;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::api::serp::SerpItem;
use crate::domain::cost::{self, CostAction};
use crate::domain::types::Mode;
use crate::errors::Result;
use crate::state::AppState;
use crate::store::ledger::{self, LedgerEntry};

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

    let start = std::time::Instant::now();
    let resp = state
        .api
        .serp_google_organic_live(&keyword, location_code, &language_code, depth)
        .await?;
    let duration_ms = start.elapsed().as_millis() as i64;

    let store = state.store.clone();
    let cost = resp.cost;
    task::spawn_blocking(move || -> Result<()> {
        store.with_conn(|c| {
            ledger::record(
                c,
                &LedgerEntry {
                    endpoint: "serp.google.organic.live",
                    mode: "live",
                    cost_usd: cost,
                    estimated_usd: Some(estimated_usd),
                    // request_size is keyword count, not response item count.
                    request_size: Some(1),
                    response_status: Some(20000),
                    duration_ms: Some(duration_ms),
                    task_id: None,
                    error: None,
                },
            )
        })
    })
    .await
    .map_err(|e| crate::errors::AppError::Internal(e.to_string()))??;

    Ok(SerpLiveBatch {
        keyword: resp.keyword,
        items: resp.items.into_iter().map(SerpResultItem::from).collect(),
        cost_usd: resp.cost,
        estimated_usd,
    })
}
