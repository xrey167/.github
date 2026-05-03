//! Generic response cache. Stores raw JSON responses keyed on
//! (endpoint, params_hash) so any command can opt in without a bespoke
//! schema. TTL is enforced at read time.

use chrono::{DateTime, Duration, Utc};
use duckdb::{params, Connection};

use crate::errors::Result;

pub struct CacheHit {
    pub response: serde_json::Value,
    pub cost_usd: f64,
    pub fetched_at: String,
}

pub fn get(
    conn: &mut Connection,
    endpoint: &str,
    params_hash: &str,
    max_age: Duration,
) -> Result<Option<CacheHit>> {
    let cutoff: DateTime<Utc> = Utc::now() - max_age;
    let mut stmt = conn.prepare(
        "SELECT response_json, cost_usd, CAST(fetched_at AS VARCHAR)
           FROM response_cache
          WHERE endpoint = $1 AND params_hash = $2 AND fetched_at >= $3",
    )?;
    let mut rows = stmt.query(duckdb::params![endpoint, params_hash, cutoff.naive_utc()])?;
    if let Some(row) = rows.next()? {
        let json_str: String = row.get(0)?;
        let cost: Option<f64> = row.get(1)?;
        let fetched_at: Option<String> = row.get(2)?;
        let parsed: serde_json::Value =
            serde_json::from_str(&json_str).unwrap_or(serde_json::Value::Null);
        return Ok(Some(CacheHit {
            response: parsed,
            cost_usd: cost.unwrap_or(0.0),
            fetched_at: fetched_at.unwrap_or_default(),
        }));
    }
    Ok(None)
}

pub fn put(
    conn: &mut Connection,
    endpoint: &str,
    params_hash: &str,
    response: &serde_json::Value,
    cost_usd: f64,
) -> Result<()> {
    let json_str = serde_json::to_string(response).unwrap_or_else(|_| "null".to_string());
    conn.execute(
        "INSERT INTO response_cache (endpoint, params_hash, response_json, cost_usd, fetched_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (endpoint, params_hash) DO UPDATE SET
            response_json = excluded.response_json,
            cost_usd = excluded.cost_usd,
            fetched_at = CURRENT_TIMESTAMP",
        params![endpoint, params_hash, json_str, cost_usd],
    )?;
    Ok(())
}

/// Wipe stale entries. Called periodically; keeps the DB from growing
/// unbounded for endpoints that get many distinct param combinations.
pub fn evict_older_than(conn: &mut Connection, max_age: Duration) -> Result<usize> {
    let cutoff: DateTime<Utc> = Utc::now() - max_age;
    let n = conn.execute(
        "DELETE FROM response_cache WHERE fetched_at < $1",
        params![cutoff.naive_utc()],
    )?;
    Ok(n)
}
