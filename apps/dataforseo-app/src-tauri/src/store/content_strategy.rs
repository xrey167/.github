//! Editorial calendar persistence. Backs the Content Strategy page —
//! a per-project list of planned posts with status + scheduled-for date.

use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct PlannedPost {
    pub id: i64,
    pub project_id: Option<i64>,
    pub title: String,
    pub target_keyword: Option<String>,
    /// 'idea' | 'drafting' | 'review' | 'published' | 'archived'
    pub status: String,
    /// ISO date (YYYY-MM-DD) the post is scheduled to be published.
    pub scheduled_for: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

pub fn create(
    conn: &mut Connection,
    project_id: Option<i64>,
    title: &str,
    target_keyword: Option<&str>,
    status: &str,
    scheduled_for: Option<&str>,
    notes: Option<&str>,
) -> Result<i64> {
    let id: i64 = conn.query_row(
        "INSERT INTO planned_posts
            (project_id, title, target_keyword, status, scheduled_for, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id",
        params![project_id, title, target_keyword, status, scheduled_for, notes],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn update(
    conn: &mut Connection,
    id: i64,
    title: &str,
    target_keyword: Option<&str>,
    status: &str,
    scheduled_for: Option<&str>,
    notes: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE planned_posts
            SET title = $2,
                target_keyword = $3,
                status = $4,
                scheduled_for = $5,
                notes = $6,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1",
        params![id, title, target_keyword, status, scheduled_for, notes],
    )?;
    Ok(())
}

pub fn delete(conn: &mut Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM planned_posts WHERE id = $1", params![id])?;
    Ok(())
}

/// List planned posts for a project (or all if `project_id` is None).
/// Newest scheduled date first, then by created_at.
pub fn list(conn: &mut Connection, project_id: Option<i64>) -> Result<Vec<PlannedPost>> {
    // DuckDB doesn't optimise away parameters in `(? IS NULL OR project_id = ?)`
    // as cleanly as SQLite, so split the query into two paths.
    // Named CAST aliases (scheduled_for_s / created_at_s / updated_at_s)
    // let the row-mapping below use column names instead of indices —
    // safer if the SELECT list is ever reordered.
    let sql = if project_id.is_some() {
        "SELECT id, project_id, title, target_keyword, status,
                CAST(scheduled_for AS VARCHAR) AS scheduled_for_s,
                notes,
                CAST(created_at AS VARCHAR)    AS created_at_s,
                CAST(updated_at AS VARCHAR)    AS updated_at_s
           FROM planned_posts
          WHERE project_id = $1
          ORDER BY scheduled_for DESC NULLS LAST, created_at DESC"
    } else {
        "SELECT id, project_id, title, target_keyword, status,
                CAST(scheduled_for AS VARCHAR) AS scheduled_for_s,
                notes,
                CAST(created_at AS VARCHAR)    AS created_at_s,
                CAST(updated_at AS VARCHAR)    AS updated_at_s
           FROM planned_posts
          ORDER BY scheduled_for DESC NULLS LAST, created_at DESC"
    };

    let mut stmt = conn.prepare(sql)?;
    let mut rows = if let Some(pid) = project_id {
        stmt.query(params![pid])?
    } else {
        stmt.query([])?
    };

    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(PlannedPost {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            title: row.get("title")?,
            target_keyword: row.get("target_keyword")?,
            status: row.get("status")?,
            scheduled_for: row.get("scheduled_for_s")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at_s")?,
            updated_at: row.get("updated_at_s")?,
        });
    }
    Ok(out)
}
