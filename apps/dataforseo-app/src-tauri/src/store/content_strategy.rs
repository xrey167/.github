//! Editorial calendar + topic clusters persistence. Backs the Content
//! Strategy page — planned posts (per-project, scheduled, statused) and
//! topic clusters that group posts under a pillar topic.

use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct PlannedPost {
    pub id: i64,
    pub project_id: Option<i64>,
    pub cluster_id: Option<i64>,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TopicCluster {
    pub id: i64,
    pub project_id: Option<i64>,
    pub name: String,
    pub pillar_keyword: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

// ---------- planned_posts CRUD ----------

#[allow(clippy::too_many_arguments)]
pub fn create(
    conn: &mut Connection,
    project_id: Option<i64>,
    cluster_id: Option<i64>,
    title: &str,
    target_keyword: Option<&str>,
    status: &str,
    scheduled_for: Option<&str>,
    notes: Option<&str>,
) -> Result<i64> {
    let id: i64 = conn.query_row(
        "INSERT INTO planned_posts
            (project_id, cluster_id, title, target_keyword, status, scheduled_for, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id",
        params![
            project_id,
            cluster_id,
            title,
            target_keyword,
            status,
            scheduled_for,
            notes
        ],
        |row| row.get(0),
    )?;
    Ok(id)
}

#[allow(clippy::too_many_arguments)]
pub fn update(
    conn: &mut Connection,
    id: i64,
    cluster_id: Option<i64>,
    title: &str,
    target_keyword: Option<&str>,
    status: &str,
    scheduled_for: Option<&str>,
    notes: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE planned_posts
            SET cluster_id = $2,
                title = $3,
                target_keyword = $4,
                status = $5,
                scheduled_for = $6,
                notes = $7,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1",
        params![
            id,
            cluster_id,
            title,
            target_keyword,
            status,
            scheduled_for,
            notes
        ],
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
    // Named CAST aliases let the row mapping use column names — robust to
    // SELECT-list reorders.
    let sql = if project_id.is_some() {
        "SELECT id, project_id, cluster_id, title, target_keyword, status,
                CAST(scheduled_for AS VARCHAR) AS scheduled_for_s,
                notes,
                CAST(created_at AS VARCHAR)    AS created_at_s,
                CAST(updated_at AS VARCHAR)    AS updated_at_s
           FROM planned_posts
          WHERE project_id = $1
          ORDER BY scheduled_for DESC NULLS LAST, created_at DESC"
    } else {
        "SELECT id, project_id, cluster_id, title, target_keyword, status,
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
            cluster_id: row.get("cluster_id")?,
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

// ---------- topic_clusters CRUD ----------

pub fn cluster_create(
    conn: &mut Connection,
    project_id: Option<i64>,
    name: &str,
    pillar_keyword: Option<&str>,
    description: Option<&str>,
    color: Option<&str>,
) -> Result<i64> {
    let id: i64 = conn.query_row(
        "INSERT INTO topic_clusters
            (project_id, name, pillar_keyword, description, color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id",
        params![project_id, name, pillar_keyword, description, color],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn cluster_update(
    conn: &mut Connection,
    id: i64,
    name: &str,
    pillar_keyword: Option<&str>,
    description: Option<&str>,
    color: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE topic_clusters
            SET name = $2,
                pillar_keyword = $3,
                description = $4,
                color = $5,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1",
        params![id, name, pillar_keyword, description, color],
    )?;
    Ok(())
}

/// Deletes the cluster and unsets `cluster_id` on any posts that pointed
/// to it (planned posts survive — we only drop the grouping).
pub fn cluster_delete(conn: &mut Connection, id: i64) -> Result<()> {
    conn.execute(
        "UPDATE planned_posts SET cluster_id = NULL WHERE cluster_id = $1",
        params![id],
    )?;
    conn.execute("DELETE FROM topic_clusters WHERE id = $1", params![id])?;
    Ok(())
}

pub fn cluster_list(
    conn: &mut Connection,
    project_id: Option<i64>,
) -> Result<Vec<TopicCluster>> {
    let sql = if project_id.is_some() {
        "SELECT id, project_id, name, pillar_keyword, description, color,
                CAST(created_at AS VARCHAR) AS created_at_s,
                CAST(updated_at AS VARCHAR) AS updated_at_s
           FROM topic_clusters
          WHERE project_id = $1
          ORDER BY name ASC"
    } else {
        "SELECT id, project_id, name, pillar_keyword, description, color,
                CAST(created_at AS VARCHAR) AS created_at_s,
                CAST(updated_at AS VARCHAR) AS updated_at_s
           FROM topic_clusters
          ORDER BY name ASC"
    };

    let mut stmt = conn.prepare(sql)?;
    let mut rows = if let Some(pid) = project_id {
        stmt.query(params![pid])?
    } else {
        stmt.query([])?
    };

    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(TopicCluster {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            name: row.get("name")?,
            pillar_keyword: row.get("pillar_keyword")?,
            description: row.get("description")?,
            color: row.get("color")?,
            created_at: row.get("created_at_s")?,
            updated_at: row.get("updated_at_s")?,
        });
    }
    Ok(out)
}
