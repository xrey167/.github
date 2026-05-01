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
