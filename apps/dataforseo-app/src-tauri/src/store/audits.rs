//! Site Audit storage. Two tables:
//!
//! - audit_runs: one row per crawl. Tracks task_id and lifecycle status.
//! - audit_pages: per-URL audit data, one row per page in the crawl.
//!
//! The background audit_poller advances pending → running → ready and
//! populates `summary_json` + audit_pages once the task is fetchable.

use chrono::{DateTime, Duration, Utc};
use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AuditRun {
    pub id: i64,
    pub target: String,
    pub task_id: Option<String>,
    pub max_crawl_pages: i32,
    /// 'pending' | 'running' | 'ready' | 'failed'
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub last_polled_at: Option<String>,
    pub cost_usd: Option<f64>,
    pub summary: Option<serde_json::Value>,
    pub error: Option<String>,
    pub page_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AuditPage {
    pub id: i64,
    pub url: String,
    pub status_code: Option<i32>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub h1: Option<String>,
    pub plain_text_word_count: Option<i32>,
    pub page_timing_ttfb: Option<i32>,
    pub onpage_score: Option<f64>,
    pub raw: serde_json::Value,
}

pub fn create_run(
    conn: &mut Connection,
    target: &str,
    task_id: &str,
    max_crawl_pages: u32,
    cost_usd: f64,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO audit_runs
            (target, task_id, max_crawl_pages, status, cost_usd)
         VALUES ($1, $2, $3, 'pending', $4)",
        params![target, task_id, max_crawl_pages as i64, cost_usd],
    )?;
    let id: i64 = conn.query_row(
        "SELECT id FROM audit_runs WHERE task_id = $1",
        params![task_id],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn list_runs(conn: &mut Connection, limit: u32) -> Result<Vec<AuditRun>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.target, r.task_id, r.max_crawl_pages, r.status,
                CAST(r.started_at AS VARCHAR), CAST(r.completed_at AS VARCHAR),
                CAST(r.last_polled_at AS VARCHAR), r.cost_usd, r.summary_json, r.error,
                (SELECT COUNT(*) FROM audit_pages p WHERE p.audit_run_id = r.id) AS page_count
           FROM audit_runs r
          ORDER BY r.started_at DESC
          LIMIT $1",
    )?;
    let mut rows = stmt.query(params![limit as i64])?;
    let mut out: Vec<AuditRun> = Vec::new();
    while let Some(row) = rows.next()? {
        let summary_str: Option<String> = row.get(9)?;
        let summary = summary_str
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());
        out.push(AuditRun {
            id: row.get(0)?,
            target: row.get(1)?,
            task_id: row.get(2)?,
            max_crawl_pages: row.get::<_, i64>(3)? as i32,
            status: row.get(4)?,
            started_at: row.get(5)?,
            completed_at: row.get(6)?,
            last_polled_at: row.get(7)?,
            cost_usd: row.get(8)?,
            summary,
            error: row.get(10)?,
            page_count: row.get(11)?,
        });
    }
    Ok(out)
}

pub fn get_run(conn: &mut Connection, id: i64) -> Result<Option<AuditRun>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.target, r.task_id, r.max_crawl_pages, r.status,
                CAST(r.started_at AS VARCHAR), CAST(r.completed_at AS VARCHAR),
                CAST(r.last_polled_at AS VARCHAR), r.cost_usd, r.summary_json, r.error,
                (SELECT COUNT(*) FROM audit_pages p WHERE p.audit_run_id = r.id) AS page_count
           FROM audit_runs r
          WHERE r.id = $1",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        let summary_str: Option<String> = row.get(9)?;
        let summary = summary_str
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());
        return Ok(Some(AuditRun {
            id: row.get(0)?,
            target: row.get(1)?,
            task_id: row.get(2)?,
            max_crawl_pages: row.get::<_, i64>(3)? as i32,
            status: row.get(4)?,
            started_at: row.get(5)?,
            completed_at: row.get(6)?,
            last_polled_at: row.get(7)?,
            cost_usd: row.get(8)?,
            summary,
            error: row.get(10)?,
            page_count: row.get(11)?,
        }));
    }
    Ok(None)
}

pub fn delete_run(conn: &mut Connection, id: i64) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "DELETE FROM audit_pages WHERE audit_run_id = $1",
        params![id],
    )?;
    tx.execute("DELETE FROM audit_runs WHERE id = $1", params![id])?;
    tx.commit()?;
    Ok(())
}

// Poller helpers ----------------------------------------------------

pub fn find_pending_runs(conn: &mut Connection) -> Result<Vec<(i64, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, task_id FROM audit_runs
          WHERE status IN ('pending','running') AND task_id IS NOT NULL
          ORDER BY started_at ASC",
    )?;
    let mut rows = stmt.query([])?;
    let mut out: Vec<(i64, String)> = Vec::new();
    while let Some(row) = rows.next()? {
        let id: i64 = row.get(0)?;
        let task_id: Option<String> = row.get(1)?;
        if let Some(t) = task_id {
            out.push((id, t));
        }
    }
    Ok(out)
}

pub fn mark_polled(conn: &mut Connection, id: i64) -> Result<()> {
    conn.execute(
        "UPDATE audit_runs SET last_polled_at = CURRENT_TIMESTAMP, status = 'running' WHERE id = $1",
        params![id],
    )?;
    Ok(())
}

pub fn mark_failed(conn: &mut Connection, id: i64, error: &str) -> Result<()> {
    conn.execute(
        "UPDATE audit_runs SET status = 'failed', error = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2",
        params![error, id],
    )?;
    Ok(())
}

pub fn mark_ready(
    conn: &mut Connection,
    id: i64,
    summary: &serde_json::Value,
    pages: &[serde_json::Value],
) -> Result<()> {
    let summary_str = serde_json::to_string(summary).unwrap_or_else(|_| "null".into());
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE audit_runs
            SET status = 'ready',
                completed_at = CURRENT_TIMESTAMP,
                summary_json = $1
          WHERE id = $2",
        params![summary_str, id],
    )?;
    {
        let mut insert = tx.prepare(
            "INSERT INTO audit_pages
                (audit_run_id, url, status_code, title, description, h1,
                 plain_text_word_count, page_timing_ttfb, onpage_score, raw_json)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )?;
        for p in pages {
            // Defensive .pointer reads — DataForSEO occasionally drops fields
            // for partial-fail pages and we'd rather store a sparse row than
            // skip the whole page.
            let url = p.pointer("/url").and_then(|v| v.as_str()).unwrap_or("");
            let status_code = p
                .pointer("/status_code")
                .and_then(|v| v.as_i64())
                .map(|n| n as i32);
            let title = p
                .pointer("/meta/title")
                .and_then(|v| v.as_str())
                .map(|s| s.to_owned());
            let description = p
                .pointer("/meta/description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_owned());
            let h1 = p
                .pointer("/meta/htags/h1/0")
                .and_then(|v| v.as_str())
                .map(|s| s.to_owned());
            let word_count = p
                .pointer("/content/plain_text_word_count")
                .and_then(|v| v.as_i64())
                .map(|n| n as i32);
            let ttfb = p
                .pointer("/page_timing/time_to_secure_connection")
                .and_then(|v| v.as_i64())
                .map(|n| n as i32);
            let score = p.pointer("/onpage_score").and_then(|v| v.as_f64());
            let raw_str = serde_json::to_string(p).unwrap_or_else(|_| "null".into());
            insert.execute(params![
                id, url, status_code, title, description, h1, word_count, ttfb, score, raw_str
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn list_pages(
    conn: &mut Connection,
    audit_run_id: i64,
    limit: u32,
    offset: u32,
) -> Result<Vec<AuditPage>> {
    let mut stmt = conn.prepare(
        "SELECT id, url, status_code, title, description, h1,
                plain_text_word_count, page_timing_ttfb, onpage_score, raw_json
           FROM audit_pages
          WHERE audit_run_id = $1
          ORDER BY COALESCE(onpage_score, 100) ASC, id ASC
          LIMIT $2 OFFSET $3",
    )?;
    let mut rows = stmt.query(params![audit_run_id, limit as i64, offset as i64])?;
    let mut out: Vec<AuditPage> = Vec::new();
    while let Some(row) = rows.next()? {
        let raw_str: Option<String> = row.get(9)?;
        let raw = raw_str
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or(serde_json::Value::Null);
        out.push(AuditPage {
            id: row.get(0)?,
            url: row.get(1)?,
            status_code: row.get::<_, Option<i64>>(2)?.map(|n| n as i32),
            title: row.get(3)?,
            description: row.get(4)?,
            h1: row.get(5)?,
            plain_text_word_count: row.get::<_, Option<i64>>(6)?.map(|n| n as i32),
            page_timing_ttfb: row.get::<_, Option<i64>>(7)?.map(|n| n as i32),
            onpage_score: row.get(8)?,
            raw,
        });
    }
    Ok(out)
}

/// Drop completed audit_runs (and their pages) older than `max_age`.
/// Called on app startup so the DB doesn't grow unbounded.
pub fn evict_completed_older_than(
    conn: &mut Connection,
    max_age: Duration,
) -> Result<usize> {
    let cutoff: DateTime<Utc> = Utc::now() - max_age;
    let tx = conn.transaction()?;
    tx.execute(
        "DELETE FROM audit_pages WHERE audit_run_id IN (
            SELECT id FROM audit_runs
             WHERE status IN ('ready','failed')
               AND COALESCE(completed_at, started_at) < $1
         )",
        params![cutoff.naive_utc()],
    )?;
    let n = tx.execute(
        "DELETE FROM audit_runs
          WHERE status IN ('ready','failed')
            AND COALESCE(completed_at, started_at) < $1",
        params![cutoff.naive_utc()],
    )?;
    tx.commit()?;
    Ok(n)
}
