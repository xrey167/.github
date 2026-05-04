//! Cache for the (cheap, slow-changing) backlinks_summary endpoint.
//! 24h TTL by default; the UI surfaces a "from cache" hint when a hit
//! lands so the user knows whether the call cost anything.

use chrono::{DateTime, Duration, Utc};
use duckdb::{params, Connection};

use crate::errors::Result;

pub fn get_summary(
    conn: &mut Connection,
    target: &str,
    max_age: Duration,
) -> Result<Option<(serde_json::Value, f64, String)>> {
    let cutoff: DateTime<Utc> = Utc::now() - max_age;
    let mut stmt = conn.prepare(
        "SELECT summary_json, cost_usd, CAST(fetched_at AS VARCHAR)
           FROM backlinks_summary_cache
          WHERE target = $1 AND fetched_at >= $2",
    )?;
    let mut rows = stmt.query(duckdb::params![target, cutoff.naive_utc()])?;
    if let Some(row) = rows.next()? {
        let json_str: String = row.get(0)?;
        let cost: Option<f64> = row.get(1)?;
        let fetched_at: Option<String> = row.get(2)?;
        let parsed: serde_json::Value =
            serde_json::from_str(&json_str).unwrap_or(serde_json::Value::Null);
        return Ok(Some((parsed, cost.unwrap_or(0.0), fetched_at.unwrap_or_default())));
    }
    Ok(None)
}

pub fn put_summary(
    conn: &mut Connection,
    target: &str,
    summary: &serde_json::Value,
    cost_usd: f64,
) -> Result<()> {
    // Use "null" instead of "" if serialization fails — empty string is
    // not valid JSON and DuckDB would reject the insert at parse time.
    let json_str = serde_json::to_string(summary).unwrap_or_else(|_| "null".to_string());
    conn.execute(
        "INSERT INTO backlinks_summary_cache (target, summary_json, cost_usd, fetched_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (target) DO UPDATE SET
            summary_json = excluded.summary_json,
            cost_usd = excluded.cost_usd,
            fetched_at = excluded.fetched_at",
        params![target, json_str, cost_usd],
    )?;
    Ok(())
}
