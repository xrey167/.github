use std::collections::HashMap;

use chrono::{DateTime, Duration, Utc};
use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct KeywordVolume {
    pub keyword: String,
    pub search_volume: Option<i64>,
    pub competition: Option<String>,
    pub competition_index: Option<i32>,
    pub cpc: Option<f64>,
    pub low_top_of_page_bid: Option<f64>,
    pub high_top_of_page_bid: Option<f64>,
    /// Trend data (24-month) as raw JSON for the chart.
    pub monthly_searches: Option<serde_json::Value>,
    pub from_cache: bool,
}

pub fn get_fresh(
    conn: &mut Connection,
    keywords: &[String],
    location_code: u32,
    language_code: &str,
    max_age: Duration,
) -> Result<HashMap<String, KeywordVolume>> {
    if keywords.is_empty() {
        return Ok(HashMap::new());
    }
    let cutoff: DateTime<Utc> = Utc::now() - max_age;

    let placeholders = (0..keywords.len())
        .map(|i| format!("${}", i + 4))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT keyword, search_volume, competition, competition_index, cpc,
                low_top_of_page_bid, high_top_of_page_bid, monthly_searches
           FROM keyword_volume_cache
          WHERE location_code = $1
            AND language_code = $2
            AND fetched_at >= $3
            AND keyword IN ({placeholders})"
    );

    let mut stmt = conn.prepare(&sql)?;
    let mut params_vec: Vec<duckdb::types::Value> = vec![
        (location_code as i64).into(),
        language_code.into(),
        cutoff.naive_utc().into(),
    ];
    for k in keywords {
        params_vec.push(k.clone().into());
    }
    let params_refs: Vec<&dyn duckdb::ToSql> =
        params_vec.iter().map(|v| v as &dyn duckdb::ToSql).collect();

    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut out = HashMap::new();
    while let Some(row) = rows.next()? {
        let keyword: String = row.get(0)?;
        let monthly: Option<String> = row.get(7)?;
        out.insert(
            keyword.clone(),
            KeywordVolume {
                keyword,
                search_volume: row.get(1)?,
                competition: row.get(2)?,
                competition_index: row.get(3)?,
                cpc: row.get(4)?,
                low_top_of_page_bid: row.get(5)?,
                high_top_of_page_bid: row.get(6)?,
                monthly_searches: monthly
                    .as_deref()
                    .and_then(|s| serde_json::from_str(s).ok()),
                from_cache: true,
            },
        );
    }
    Ok(out)
}

pub fn put_batch(
    conn: &mut Connection,
    location_code: u32,
    language_code: &str,
    rows: &[KeywordVolume],
) -> Result<()> {
    if rows.is_empty() {
        return Ok(());
    }
    let tx = conn.transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO keyword_volume_cache
                (keyword, location_code, language_code, search_volume, competition,
                 competition_index, cpc, low_top_of_page_bid, high_top_of_page_bid,
                 monthly_searches, fetched_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
             ON CONFLICT (keyword, location_code, language_code) DO UPDATE SET
                search_volume = excluded.search_volume,
                competition = excluded.competition,
                competition_index = excluded.competition_index,
                cpc = excluded.cpc,
                low_top_of_page_bid = excluded.low_top_of_page_bid,
                high_top_of_page_bid = excluded.high_top_of_page_bid,
                monthly_searches = excluded.monthly_searches,
                fetched_at = CURRENT_TIMESTAMP",
        )?;
        for r in rows {
            let monthly_str = r
                .monthly_searches
                .as_ref()
                .map(|v| serde_json::to_string(v).unwrap_or_default());
            stmt.execute(params![
                &r.keyword,
                location_code as i64,
                language_code,
                r.search_volume,
                r.competition,
                r.competition_index,
                r.cpc,
                r.low_top_of_page_bid,
                r.high_top_of_page_bid,
                monthly_str,
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}
