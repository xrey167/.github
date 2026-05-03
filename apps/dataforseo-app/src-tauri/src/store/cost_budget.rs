//! Daily and monthly cost budgets. The user can set a USD limit + alert
//! threshold (e.g. warn at 80%); the ledger sums today's spend and the
//! UI shows status. Enforcement is advisory — we don't block calls,
//! since the user might genuinely want to bust through for a one-off.

use chrono::{Datelike, NaiveDate, Utc};
use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct Budget {
    pub period: String, // 'daily' | 'monthly'
    pub limit_usd: f64,
    pub alert_at_pct: f64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct BudgetStatus {
    pub period: String,
    pub limit_usd: Option<f64>,
    pub alert_at_pct: Option<f64>,
    pub spent_usd: f64,
    pub used_pct: Option<f64>,
    /// "ok" | "alert" | "exceeded" | "no_budget"
    pub state: String,
}

pub fn upsert(conn: &mut Connection, budget: &Budget) -> Result<()> {
    conn.execute(
        "INSERT INTO cost_budget (period, limit_usd, alert_at_pct, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (period) DO UPDATE SET
            limit_usd = excluded.limit_usd,
            alert_at_pct = excluded.alert_at_pct,
            updated_at = CURRENT_TIMESTAMP",
        params![&budget.period, budget.limit_usd, budget.alert_at_pct],
    )?;
    Ok(())
}

pub fn delete(conn: &mut Connection, period: &str) -> Result<()> {
    conn.execute("DELETE FROM cost_budget WHERE period = $1", params![period])?;
    Ok(())
}

fn fetch_budget(conn: &mut Connection, period: &str) -> Result<Option<Budget>> {
    let mut stmt = conn.prepare(
        "SELECT period, limit_usd, alert_at_pct FROM cost_budget WHERE period = $1",
    )?;
    let mut rows = stmt.query(params![period])?;
    if let Some(row) = rows.next()? {
        return Ok(Some(Budget {
            period: row.get(0)?,
            limit_usd: row.get(1)?,
            alert_at_pct: row.get(2)?,
        }));
    }
    Ok(None)
}

/// Sum today's API + AI spend in USD. Both ledgers are date-tracked
/// the same way (`ts` column is local timestamp via DuckDB
/// CURRENT_TIMESTAMP), so we aggregate them with a UNION ALL.
fn spent_today(conn: &mut Connection) -> Result<f64> {
    let today: NaiveDate = Utc::now().date_naive();
    let day_start = today.and_hms_opt(0, 0, 0).expect("00:00:00 is valid");
    let mut stmt = conn.prepare(
        "SELECT COALESCE(SUM(cost_usd), 0.0) FROM (
            SELECT cost_usd FROM api_calls WHERE ts >= $1
            UNION ALL
            SELECT cost_usd FROM ai_calls   WHERE ts >= $1
         )",
    )?;
    let mut rows = stmt.query(params![day_start])?;
    if let Some(row) = rows.next()? {
        return Ok(row.get::<_, f64>(0)?);
    }
    Ok(0.0)
}

fn spent_this_month(conn: &mut Connection) -> Result<f64> {
    let today = Utc::now().date_naive();
    let first = NaiveDate::from_ymd_opt(today.year(), today.month(), 1)
        .expect("first of month is always valid");
    let month_start = first.and_hms_opt(0, 0, 0).expect("00:00:00 is valid");
    let mut stmt = conn.prepare(
        "SELECT COALESCE(SUM(cost_usd), 0.0) FROM (
            SELECT cost_usd FROM api_calls WHERE ts >= $1
            UNION ALL
            SELECT cost_usd FROM ai_calls   WHERE ts >= $1
         )",
    )?;
    let mut rows = stmt.query(params![month_start])?;
    if let Some(row) = rows.next()? {
        return Ok(row.get::<_, f64>(0)?);
    }
    Ok(0.0)
}

/// Build the full status (limit + spent + state) for a period.
pub fn status(conn: &mut Connection, period: &str) -> Result<BudgetStatus> {
    let budget = fetch_budget(conn, period)?;
    let spent = match period {
        "monthly" => spent_this_month(conn)?,
        _ => spent_today(conn)?,
    };
    let (limit_usd, alert_pct, used_pct, state) = match budget {
        Some(b) => {
            let pct = if b.limit_usd > 0.0 { (spent / b.limit_usd) * 100.0 } else { 0.0 };
            let state = if pct >= 100.0 {
                "exceeded"
            } else if pct >= b.alert_at_pct {
                "alert"
            } else {
                "ok"
            };
            (Some(b.limit_usd), Some(b.alert_at_pct), Some(pct), state.to_string())
        }
        None => (None, None, None, "no_budget".to_string()),
    };
    Ok(BudgetStatus {
        period: period.to_string(),
        limit_usd,
        alert_at_pct: alert_pct,
        spent_usd: spent,
        used_pct,
        state,
    })
}
