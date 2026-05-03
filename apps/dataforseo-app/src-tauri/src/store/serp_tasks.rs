//! Persistent SERP-Task tracking. Tasks created by task_post are persisted
//! with status='pending'; the background poller transitions them through
//! 'ready' to 'fetched' (or 'failed').

use duckdb::{params, Connection};
use serde::Serialize;
use ts_rs::TS;

use crate::errors::Result;

const FAIL_AFTER_ATTEMPTS: i32 = 48; // 48 polls * 30s = 24h ceiling

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SerpTask {
    pub task_id: String,
    pub batch_id: String,
    pub keyword: String,
    pub location_code: i32,
    pub language_code: String,
    pub depth: i32,
    pub status: String,
    pub posted_at: Option<String>,
    pub fetched_at: Option<String>,
    pub poll_attempts: i32,
    pub cost_usd: Option<f64>,
    pub error: Option<String>,
}

pub fn insert_pending(
    conn: &mut Connection,
    task_id: &str,
    batch_id: &str,
    keyword: &str,
    location_code: u32,
    language_code: &str,
    depth: u32,
) -> Result<()> {
    conn.execute(
        "INSERT INTO serp_tasks
            (task_id, batch_id, keyword, location_code, language_code, depth,
             status, poll_attempts)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0)
         ON CONFLICT (task_id) DO NOTHING",
        params![task_id, batch_id, keyword, location_code as i64, language_code, depth as i64],
    )?;
    Ok(())
}

pub fn find_pending(conn: &mut Connection) -> Result<Vec<SerpTask>> {
    fetch(conn, "WHERE status = 'pending'")
}

pub fn find_ready(conn: &mut Connection) -> Result<Vec<SerpTask>> {
    fetch(conn, "WHERE status = 'ready'")
}

pub fn list_batch(conn: &mut Connection, batch_id: &str) -> Result<Vec<SerpTask>> {
    let mut stmt = conn.prepare(
        "SELECT task_id, batch_id, keyword, location_code, language_code, depth,
                status, posted_at, fetched_at, poll_attempts, cost_usd, error
           FROM serp_tasks
          WHERE batch_id = $1
          ORDER BY posted_at",
    )?;
    let rows = stmt.query_map([batch_id], row_to_task)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

pub fn list_recent_batches(conn: &mut Connection, limit: u32) -> Result<Vec<BatchSummary>> {
    let mut stmt = conn.prepare(
        "SELECT batch_id,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'ready'   THEN 1 ELSE 0 END) AS ready,
                SUM(CASE WHEN status = 'fetched' THEN 1 ELSE 0 END) AS fetched,
                SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END) AS failed,
                MIN(posted_at) AS posted_at
           FROM serp_tasks
          GROUP BY batch_id
          ORDER BY posted_at DESC
          LIMIT $1",
    )?;
    let rows = stmt.query_map([limit as i64], |row| {
        Ok(BatchSummary {
            batch_id: row.get(0)?,
            total: row.get::<_, i64>(1)? as i32,
            pending: row.get::<_, i64>(2)? as i32,
            ready: row.get::<_, i64>(3)? as i32,
            fetched: row.get::<_, i64>(4)? as i32,
            failed: row.get::<_, i64>(5)? as i32,
            posted_at: row.get::<_, Option<String>>(6)?,
        })
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

pub fn mark_ready(conn: &mut Connection, task_id: &str) -> Result<()> {
    conn.execute(
        "UPDATE serp_tasks
            SET status = 'ready', last_polled_at = CURRENT_TIMESTAMP
          WHERE task_id = $1 AND status = 'pending'",
        params![task_id],
    )?;
    Ok(())
}

pub fn mark_fetched(conn: &mut Connection, task_id: &str, cost_usd: f64) -> Result<()> {
    conn.execute(
        "UPDATE serp_tasks
            SET status = 'fetched',
                fetched_at = CURRENT_TIMESTAMP,
                cost_usd = $2
          WHERE task_id = $1",
        params![task_id, cost_usd],
    )?;
    Ok(())
}

pub fn record_attempt(conn: &mut Connection, task_id: &str, error: Option<&str>) -> Result<()> {
    conn.execute(
        "UPDATE serp_tasks
            SET poll_attempts = poll_attempts + 1,
                last_polled_at = CURRENT_TIMESTAMP,
                status = CASE
                    WHEN poll_attempts + 1 >= $2 THEN 'failed'
                    ELSE status
                END,
                error = COALESCE($3, error)
          WHERE task_id = $1",
        params![task_id, FAIL_AFTER_ATTEMPTS as i64, error],
    )?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BatchSummary {
    pub batch_id: String,
    pub total: i32,
    pub pending: i32,
    pub ready: i32,
    pub fetched: i32,
    pub failed: i32,
    pub posted_at: Option<String>,
}

fn fetch(conn: &mut Connection, where_clause: &str) -> Result<Vec<SerpTask>> {
    let sql = format!(
        "SELECT task_id, batch_id, keyword, location_code, language_code, depth,
                status, posted_at, fetched_at, poll_attempts, cost_usd, error
           FROM serp_tasks {where_clause}"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], row_to_task)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

fn row_to_task(row: &duckdb::Row<'_>) -> duckdb::Result<SerpTask> {
    Ok(SerpTask {
        task_id: row.get(0)?,
        batch_id: row.get(1)?,
        keyword: row.get(2)?,
        location_code: row.get::<_, i64>(3)? as i32,
        language_code: row.get(4)?,
        depth: row.get::<_, i64>(5)? as i32,
        status: row.get(6)?,
        posted_at: row.get(7)?,
        fetched_at: row.get(8)?,
        poll_attempts: row.get::<_, i64>(9)? as i32,
        cost_usd: row.get(10)?,
        error: row.get(11)?,
    })
}
