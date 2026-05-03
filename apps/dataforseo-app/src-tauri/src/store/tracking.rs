//! Position tracking storage. Two tables:
//!
//! - tracked_keywords: one row per (target, keyword, location, language)
//!   the user wants to monitor. Background tracker checks this table
//!   and runs a SERP call for each due row.
//! - tracking_results: append-only history of (tracked_keyword_id,
//!   fetched_at, rank_absolute). Trend charts query the last N days.

use chrono::{DateTime, Duration, Utc};
use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TrackedKeyword {
    pub id: i64,
    pub target: String,
    pub keyword: String,
    pub location_code: i32,
    pub language_code: String,
    pub frequency: String,
    pub active: bool,
    pub created_at: Option<String>,
    pub last_run_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TrackedKeywordWithRank {
    pub keyword: TrackedKeyword,
    /// Latest recorded rank (NULL = unranked or never checked).
    pub current_rank: Option<i32>,
    /// Rank from the previous run, for the ▲/▼ change indicator.
    pub previous_rank: Option<i32>,
    /// Most recent SERP url where the target appeared, if any.
    pub current_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct RankPoint {
    pub fetched_at: String,
    pub rank_absolute: Option<i32>,
    pub url: Option<String>,
}

pub fn add(
    conn: &mut Connection,
    target: &str,
    keyword: &str,
    location_code: u32,
    language_code: &str,
    frequency: &str,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO tracked_keywords
            (target, keyword, location_code, language_code, frequency, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (target, keyword, location_code, language_code) DO UPDATE SET
            frequency = excluded.frequency,
            active = TRUE",
        params![target, keyword, location_code as i64, language_code, frequency],
    )?;
    let id: i64 = conn.query_row(
        "SELECT id FROM tracked_keywords
          WHERE target = $1 AND keyword = $2 AND location_code = $3 AND language_code = $4",
        params![target, keyword, location_code as i64, language_code],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn delete(conn: &mut Connection, id: i64) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "DELETE FROM tracking_results WHERE tracked_keyword_id = $1",
        params![id],
    )?;
    tx.execute("DELETE FROM tracked_keywords WHERE id = $1", params![id])?;
    tx.commit()?;
    Ok(())
}

/// Returns each tracked keyword along with its latest two rank readings,
/// joined in a single query. Avoids the N+1 problem the naive
/// implementation would have.
pub fn list_with_ranks(conn: &mut Connection) -> Result<Vec<TrackedKeywordWithRank>> {
    let mut stmt = conn.prepare(
        "WITH ranked AS (
            SELECT tracked_keyword_id, rank_absolute, url, fetched_at,
                   ROW_NUMBER() OVER (
                       PARTITION BY tracked_keyword_id
                       ORDER BY fetched_at DESC
                   ) AS rn
              FROM tracking_results
         )
         SELECT k.id, k.target, k.keyword, k.location_code, k.language_code,
                k.frequency, k.active,
                CAST(k.created_at AS VARCHAR), CAST(k.last_run_at AS VARCHAR),
                cur.rank_absolute, cur.url, prev.rank_absolute
           FROM tracked_keywords k
           LEFT JOIN ranked cur  ON cur.tracked_keyword_id = k.id  AND cur.rn = 1
           LEFT JOIN ranked prev ON prev.tracked_keyword_id = k.id AND prev.rn = 2
          ORDER BY k.created_at DESC",
    )?;
    let mut rows = stmt.query([])?;
    let mut out: Vec<TrackedKeywordWithRank> = Vec::new();
    while let Some(row) = rows.next()? {
        let id: i64 = row.get(0)?;
        let target: String = row.get(1)?;
        let keyword: String = row.get(2)?;
        let location_code: i32 = row.get::<_, i64>(3)? as i32;
        let language_code: String = row.get(4)?;
        let frequency: String = row.get(5)?;
        let active: bool = row.get(6)?;
        let created_at: Option<String> = row.get(7)?;
        let last_run_at: Option<String> = row.get(8)?;
        let current_rank: Option<i32> = row.get::<_, Option<i64>>(9)?.map(|v| v as i32);
        let current_url: Option<String> = row.get(10)?;
        let previous_rank: Option<i32> = row.get::<_, Option<i64>>(11)?.map(|v| v as i32);
        out.push(TrackedKeywordWithRank {
            keyword: TrackedKeyword {
                id,
                target,
                keyword,
                location_code,
                language_code,
                frequency,
                active,
                created_at,
                last_run_at,
            },
            current_rank,
            previous_rank,
            current_url,
        });
    }
    Ok(out)
}

pub fn get(conn: &mut Connection, id: i64) -> Result<Option<TrackedKeyword>> {
    let mut stmt = conn.prepare(
        "SELECT id, target, keyword, location_code, language_code, frequency, active,
                CAST(created_at AS VARCHAR), CAST(last_run_at AS VARCHAR)
           FROM tracked_keywords WHERE id = $1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        return Ok(Some(TrackedKeyword {
            id: row.get(0)?,
            target: row.get(1)?,
            keyword: row.get(2)?,
            location_code: row.get::<_, i64>(3)? as i32,
            language_code: row.get(4)?,
            frequency: row.get(5)?,
            active: row.get(6)?,
            created_at: row.get(7)?,
            last_run_at: row.get(8)?,
        }));
    }
    Ok(None)
}

pub fn record_result(
    conn: &mut Connection,
    tracked_keyword_id: i64,
    rank_absolute: Option<i32>,
    url: Option<&str>,
) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO tracking_results (tracked_keyword_id, rank_absolute, url)
         VALUES ($1, $2, $3)",
        params![tracked_keyword_id, rank_absolute, url],
    )?;
    tx.execute(
        "UPDATE tracked_keywords SET last_run_at = CURRENT_TIMESTAMP WHERE id = $1",
        params![tracked_keyword_id],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn history(
    conn: &mut Connection,
    tracked_keyword_id: i64,
    days: u32,
) -> Result<Vec<RankPoint>> {
    let cutoff: DateTime<Utc> = Utc::now() - Duration::days(days as i64);
    let mut stmt = conn.prepare(
        "SELECT CAST(fetched_at AS VARCHAR), rank_absolute, url
           FROM tracking_results
          WHERE tracked_keyword_id = $1 AND fetched_at >= $2
          ORDER BY fetched_at ASC",
    )?;
    let mut rows = stmt.query(params![tracked_keyword_id, cutoff.naive_utc()])?;
    let mut out: Vec<RankPoint> = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(RankPoint {
            fetched_at: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
            rank_absolute: row.get::<_, Option<i64>>(1)?.map(|v| v as i32),
            url: row.get(2)?,
        });
    }
    Ok(out)
}

/// Pull rows that are due for a check. "Due" = active AND
/// (last_run_at IS NULL OR last_run_at + interval(frequency) < now()).
/// "manual" rows are never returned — they only run via run_now.
pub fn due(conn: &mut Connection, limit: u32) -> Result<Vec<TrackedKeyword>> {
    let now = Utc::now().naive_utc();
    let mut stmt = conn.prepare(
        "SELECT id, target, keyword, location_code, language_code, frequency, active,
                CAST(created_at AS VARCHAR), CAST(last_run_at AS VARCHAR)
           FROM tracked_keywords
          WHERE active = TRUE
            AND frequency IN ('daily', 'weekly')
            AND (
                last_run_at IS NULL OR
                (frequency = 'daily'  AND last_run_at + INTERVAL '1 day'  < $1) OR
                (frequency = 'weekly' AND last_run_at + INTERVAL '7 day' < $1)
            )
          ORDER BY COALESCE(last_run_at, '1970-01-01') ASC
          LIMIT $2",
    )?;
    let mut rows = stmt.query(params![now, limit as i64])?;
    let mut out: Vec<TrackedKeyword> = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(TrackedKeyword {
            id: row.get(0)?,
            target: row.get(1)?,
            keyword: row.get(2)?,
            location_code: row.get::<_, i64>(3)? as i32,
            language_code: row.get(4)?,
            frequency: row.get(5)?,
            active: row.get(6)?,
            created_at: row.get(7)?,
            last_run_at: row.get(8)?,
        });
    }
    Ok(out)
}
