use duckdb::{params, Connection};
use serde::Serialize;
use ts_rs::TS;

use crate::domain::types::Mode;
use crate::errors::Result;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct LedgerEntry<'a> {
    pub endpoint: &'a str,
    pub mode: Mode,
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
            entry.mode.as_str(),
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
            ts: row.get(0)?,
            endpoint: row.get(1)?,
            mode: row.get(2)?,
            cost_usd: row.get(3)?,
            estimated_usd: row.get(4)?,
            request_size: row.get(5)?,
            duration_ms: row.get(6)?,
            error: row.get(7)?,
        })
    })?;
    Ok(rows.collect::<duckdb::Result<Vec<_>>>()?)
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
    let days_i = days as i64;

    let (total_calls, total_cost_usd, total_estimated_usd): (i64, f64, f64) = conn.query_row(
        "SELECT COUNT(*),
                COALESCE(SUM(cost_usd), 0.0),
                COALESCE(SUM(estimated_usd), 0.0)
           FROM api_calls
          WHERE ts >= CURRENT_TIMESTAMP - INTERVAL '1 day' * $1",
        [days_i],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let mut stmt = conn.prepare(
        "SELECT endpoint, COUNT(*), COALESCE(SUM(cost_usd), 0.0)
           FROM api_calls
          WHERE ts >= CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
          GROUP BY endpoint
          ORDER BY 3 DESC",
    )?;
    let rows = stmt.query_map([days_i], |row| {
        Ok(UsageByEndpoint {
            endpoint: row.get(0)?,
            call_count: row.get(1)?,
            cost_usd: row.get(2)?,
        })
    })?;
    let by_endpoint: Vec<UsageByEndpoint> = rows.collect::<duckdb::Result<_>>()?;

    Ok(UsageSummary {
        days: days as i32,
        total_calls,
        total_cost_usd,
        total_estimated_usd,
        by_endpoint,
    })
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AiCallRow {
    pub ts: String,
    pub provider: String,
    pub model: String,
    pub purpose: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
    pub duration_ms: Option<i64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AiUsageByModel {
    pub provider: String,
    pub model: String,
    pub call_count: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AiUsageSummary {
    pub days: i32,
    pub total_calls: i64,
    pub total_cost_usd: f64,
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
    pub by_model: Vec<AiUsageByModel>,
}

pub fn ai_recent(conn: &mut Connection, limit: u32) -> Result<Vec<AiCallRow>> {
    let mut stmt = conn.prepare(
        "SELECT ts, provider, model, purpose, input_tokens, output_tokens,
                cost_usd, duration_ms, error
           FROM ai_calls
          ORDER BY ts DESC
          LIMIT $1",
    )?;
    let rows = stmt.query_map([limit as i64], |row| {
        Ok(AiCallRow {
            ts: row.get(0)?,
            provider: row.get(1)?,
            model: row.get(2)?,
            purpose: row.get(3)?,
            input_tokens: row.get(4)?,
            output_tokens: row.get(5)?,
            cost_usd: row.get(6)?,
            duration_ms: row.get(7)?,
            error: row.get(8)?,
        })
    })?;
    Ok(rows.collect::<duckdb::Result<Vec<_>>>()?)
}

pub fn ai_summary(conn: &mut Connection, days: u32) -> Result<AiUsageSummary> {
    let days_i = days as i64;

    let (total_calls, total_cost_usd, total_input_tokens, total_output_tokens): (i64, f64, i64, i64) =
        conn.query_row(
            "SELECT COUNT(*),
                    COALESCE(SUM(cost_usd), 0.0),
                    COALESCE(SUM(input_tokens), 0),
                    COALESCE(SUM(output_tokens), 0)
               FROM ai_calls
              WHERE ts >= CURRENT_TIMESTAMP - INTERVAL '1 day' * $1",
            [days_i],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?;

    let mut stmt = conn.prepare(
        "SELECT provider, model, COUNT(*),
                COALESCE(SUM(input_tokens), 0),
                COALESCE(SUM(output_tokens), 0),
                COALESCE(SUM(cost_usd), 0.0)
           FROM ai_calls
          WHERE ts >= CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
          GROUP BY provider, model
          ORDER BY 6 DESC",
    )?;
    let rows = stmt.query_map([days_i], |row| {
        Ok(AiUsageByModel {
            provider: row.get(0)?,
            model: row.get(1)?,
            call_count: row.get(2)?,
            input_tokens: row.get(3)?,
            output_tokens: row.get(4)?,
            cost_usd: row.get(5)?,
        })
    })?;
    let by_model: Vec<AiUsageByModel> = rows.collect::<duckdb::Result<_>>()?;

    Ok(AiUsageSummary {
        days: days as i32,
        total_calls,
        total_cost_usd,
        total_input_tokens,
        total_output_tokens,
        by_model,
    })
}
