use duckdb::{params, Connection};
use serde::Serialize;
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LedgerEntry<'a> {
    pub endpoint: &'a str,
    pub mode: &'a str,
    pub cost_usd: f64,
    pub estimated_usd: Option<f64>,
    pub request_size: Option<i64>,
    pub response_status: Option<i64>,
    pub duration_ms: Option<i64>,
    pub task_id: Option<&'a str>,
    pub error: Option<&'a str>,
}

pub fn record(conn: &mut Connection, entry: &LedgerEntry) -> Result<()> {
    conn.execute(
        "INSERT INTO api_calls
            (endpoint, mode, cost_usd, estimated_usd, request_size,
             response_status, duration_ms, task_id, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        params![
            entry.endpoint,
            entry.mode,
            entry.cost_usd,
            entry.estimated_usd,
            entry.request_size,
            entry.response_status,
            entry.duration_ms,
            entry.task_id,
            entry.error,
        ],
    )?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct CallLogRow {
    pub ts: String,
    pub endpoint: String,
    pub mode: String,
    pub cost_usd: f64,
    pub estimated_usd: Option<f64>,
    pub request_size: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error: Option<String>,
}

pub fn recent(conn: &mut Connection, limit: u32) -> Result<Vec<CallLogRow>> {
    let mut stmt = conn.prepare(
        "SELECT ts, endpoint, mode, cost_usd, estimated_usd,
                request_size, duration_ms, error
           FROM api_calls
          ORDER BY ts DESC
          LIMIT $1",
    )?;
    let rows = stmt.query_map([limit as i64], |row| {
        Ok(CallLogRow {
            ts: row.get::<_, String>(0).unwrap_or_default(),
            endpoint: row.get(1)?,
            mode: row.get(2)?,
            cost_usd: row.get(3)?,
            estimated_usd: row.get(4)?,
            request_size: row.get(5)?,
            duration_ms: row.get(6)?,
            error: row.get(7)?,
        })
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct UsageByEndpoint {
    pub endpoint: String,
    pub call_count: i64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct UsageSummary {
    pub days: i32,
    pub total_calls: i64,
    pub total_cost_usd: f64,
    pub total_estimated_usd: f64,
    pub by_endpoint: Vec<UsageByEndpoint>,
}

pub fn summary(conn: &mut Connection, days: u32) -> Result<UsageSummary> {
    let cutoff_sql = format!("CURRENT_TIMESTAMP - INTERVAL '{} days'", days);
    let totals_sql = format!(
        "SELECT COUNT(*),
                COALESCE(SUM(cost_usd), 0),
                COALESCE(SUM(estimated_usd), 0)
           FROM api_calls
          WHERE ts >= {cutoff_sql}"
    );
    let (total_calls, total_cost_usd, total_estimated_usd): (i64, f64, f64) =
        conn.query_row(&totals_sql, [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;

    let by_endpoint_sql = format!(
        "SELECT endpoint, COUNT(*), COALESCE(SUM(cost_usd), 0)
           FROM api_calls
          WHERE ts >= {cutoff_sql}
          GROUP BY endpoint
          ORDER BY 3 DESC"
    );
    let mut stmt = conn.prepare(&by_endpoint_sql)?;
    let rows = stmt.query_map([], |row| {
        Ok(UsageByEndpoint {
            endpoint: row.get(0)?,
            call_count: row.get(1)?,
            cost_usd: row.get(2)?,
        })
    })?;
    let mut by_endpoint = Vec::new();
    for r in rows {
        by_endpoint.push(r?);
    }

    Ok(UsageSummary {
        days: days as i32,
        total_calls,
        total_cost_usd,
        total_estimated_usd,
        by_endpoint,
    })
}
