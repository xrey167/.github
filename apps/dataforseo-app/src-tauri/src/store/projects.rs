//! Multi-domain projects. Each project groups tracked_keywords +
//! audit_runs (+ brand snapshots in future) by a logical owner —
//! typically one client domain. CRUD plus a startup backfill that
//! idempotently creates project rows for every target the user has
//! historical data for.

use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub target: String,
    pub created_at: Option<String>,
}

pub fn list(conn: &mut Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, target, CAST(created_at AS VARCHAR)
           FROM projects ORDER BY created_at ASC, id ASC",
    )?;
    let mut rows = stmt.query([])?;
    let mut out: Vec<Project> = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            target: row.get(2)?,
            created_at: row.get(3)?,
        });
    }
    Ok(out)
}

pub fn create(conn: &mut Connection, name: &str, target: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO projects (name, target) VALUES ($1, $2)
         ON CONFLICT (target) DO UPDATE SET name = excluded.name",
        params![name, target],
    )?;
    let id: i64 = conn.query_row(
        "SELECT id FROM projects WHERE target = $1",
        params![target],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn rename(conn: &mut Connection, id: i64, name: &str) -> Result<()> {
    conn.execute(
        "UPDATE projects SET name = $1 WHERE id = $2",
        params![name, id],
    )?;
    Ok(())
}

/// Cascade delete — clears project_id on dependent rows but does not
/// drop them. Position tracking + audit history survive a project
/// removal in case the user wants them re-attributed later.
pub fn delete(conn: &mut Connection, id: i64) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE tracked_keywords SET project_id = NULL WHERE project_id = $1",
        params![id],
    )?;
    tx.execute(
        "UPDATE audit_runs SET project_id = NULL WHERE project_id = $1",
        params![id],
    )?;
    tx.execute("DELETE FROM projects WHERE id = $1", params![id])?;
    tx.commit()?;
    Ok(())
}

/// Idempotent backfill. For every distinct target in tracked_keywords
/// and audit_runs without a project_id, create (or reuse) a project
/// row and link the dependent rows. Run at startup so users upgrading
/// from a pre-projects build don't end up with orphan history.
pub fn backfill(conn: &mut Connection) -> Result<usize> {
    let tx = conn.transaction()?;
    // Collect the union of (target) keys from both source tables.
    let mut targets: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    {
        let mut stmt = tx.prepare(
            "SELECT DISTINCT target FROM tracked_keywords WHERE project_id IS NULL
             UNION
             SELECT DISTINCT target FROM audit_runs       WHERE project_id IS NULL",
        )?;
        let mut rows = stmt.query([])?;
        while let Some(row) = rows.next()? {
            let t: Option<String> = row.get(0)?;
            if let Some(t) = t.filter(|s| !s.is_empty()) {
                targets.insert(t);
            }
        }
    }
    let mut backfilled = 0_usize;
    for target in targets {
        // Insert project (or reuse existing).
        tx.execute(
            "INSERT INTO projects (name, target) VALUES ($1, $1)
             ON CONFLICT (target) DO NOTHING",
            params![&target],
        )?;
        let pid: i64 = tx.query_row(
            "SELECT id FROM projects WHERE target = $1",
            params![&target],
            |row| row.get(0),
        )?;
        // Backfill child tables.
        let n1 = tx.execute(
            "UPDATE tracked_keywords SET project_id = $1 WHERE target = $2 AND project_id IS NULL",
            params![pid, &target],
        )?;
        let n2 = tx.execute(
            "UPDATE audit_runs SET project_id = $1 WHERE target = $2 AND project_id IS NULL",
            params![pid, &target],
        )?;
        backfilled += n1 + n2;
    }
    tx.commit()?;
    Ok(backfilled)
}
