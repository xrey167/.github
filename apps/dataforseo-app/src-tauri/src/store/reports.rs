//! CRUD for scheduled PDF reports.

use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct ReportSchedule {
    pub id: i64,
    pub project_id: Option<i64>,
    pub kind: String,
    pub cadence: String,
    pub active: bool,
    pub last_run_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct ReportRun {
    pub id: i64,
    pub schedule_id: i64,
    pub pdf_path: String,
    pub generated_at: Option<String>,
}

pub fn list_schedules(conn: &mut Connection) -> Result<Vec<ReportSchedule>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, kind, cadence, active,
                CAST(last_run_at AS VARCHAR), CAST(created_at AS VARCHAR)
         FROM report_schedules ORDER BY created_at ASC, id ASC",
    )?;
    let mut rows = stmt.query([])?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(ReportSchedule {
            id: row.get(0)?,
            project_id: row.get(1)?,
            kind: row.get(2)?,
            cadence: row.get(3)?,
            active: row.get(4)?,
            last_run_at: row.get(5)?,
            created_at: row.get(6)?,
        });
    }
    Ok(out)
}

pub fn create_schedule(
    conn: &mut Connection,
    project_id: Option<i64>,
    kind: &str,
    cadence: &str,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO report_schedules (project_id, kind, cadence)
         VALUES ($1, $2, $3)",
        params![project_id, kind, cadence],
    )?;
    let id: i64 = conn.query_row(
        "SELECT MAX(id) FROM report_schedules",
        [],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn toggle_schedule(conn: &mut Connection, id: i64, active: bool) -> Result<()> {
    conn.execute(
        "UPDATE report_schedules SET active = $1 WHERE id = $2",
        params![active, id],
    )?;
    Ok(())
}

pub fn delete_schedule(conn: &mut Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM report_runs    WHERE schedule_id = $1", params![id])?;
    conn.execute("DELETE FROM report_schedules WHERE id = $1", params![id])?;
    Ok(())
}

pub fn list_runs(conn: &mut Connection, schedule_id: i64, limit: u32) -> Result<Vec<ReportRun>> {
    let mut stmt = conn.prepare(
        "SELECT id, schedule_id, pdf_path, CAST(generated_at AS VARCHAR)
         FROM report_runs WHERE schedule_id = $1
         ORDER BY generated_at DESC LIMIT $2",
    )?;
    let mut rows = stmt.query(params![schedule_id, limit])?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(ReportRun {
            id: row.get(0)?,
            schedule_id: row.get(1)?,
            pdf_path: row.get(2)?,
            generated_at: row.get(3)?,
        });
    }
    Ok(out)
}

pub fn record_run(conn: &mut Connection, schedule_id: i64, pdf_path: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO report_runs (schedule_id, pdf_path) VALUES ($1, $2)",
        params![schedule_id, pdf_path],
    )?;
    let id: i64 = conn.query_row(
        "SELECT MAX(id) FROM report_runs WHERE schedule_id = $1",
        params![schedule_id],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn mark_ran(conn: &mut Connection, id: i64) -> Result<()> {
    conn.execute(
        "UPDATE report_schedules SET last_run_at = CURRENT_TIMESTAMP WHERE id = $1",
        params![id],
    )?;
    Ok(())
}

/// Pull schedules that are due: active + overdue for their cadence.
pub fn due_schedules(conn: &mut Connection) -> Result<Vec<ReportSchedule>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, kind, cadence, active,
                CAST(last_run_at AS VARCHAR), CAST(created_at AS VARCHAR)
         FROM report_schedules
         WHERE active = TRUE
           AND (
             (cadence = 'daily'  AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '1 day'))
          OR (cadence = 'weekly' AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '7 days'))
           )
         ORDER BY id ASC",
    )?;
    let mut rows = stmt.query([])?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(ReportSchedule {
            id: row.get(0)?,
            project_id: row.get(1)?,
            kind: row.get(2)?,
            cadence: row.get(3)?,
            active: row.get(4)?,
            last_run_at: row.get(5)?,
            created_at: row.get(6)?,
        });
    }
    Ok(out)
}
