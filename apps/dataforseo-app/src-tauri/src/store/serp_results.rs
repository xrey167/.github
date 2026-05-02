use duckdb::{params, Connection};
use serde::Serialize;
use ts_rs::TS;

use crate::api::serp::SerpItem;
use crate::errors::Result;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct StoredSerpItem {
    pub task_id: String,
    pub position: i32,
    pub kind: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub domain: Option<String>,
}

pub fn insert_batch(conn: &mut Connection, task_id: &str, items: &[SerpItem]) -> Result<()> {
    if items.is_empty() {
        return Ok(());
    }
    let tx = conn.transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO serp_results
                (task_id, position, type, url, title, description, domain)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (task_id, position) DO UPDATE SET
                type = excluded.type,
                url = excluded.url,
                title = excluded.title,
                description = excluded.description,
                domain = excluded.domain",
        )?;
        for (idx, item) in items.iter().enumerate() {
            let position = item.rank_absolute.unwrap_or(idx as i32 + 1) as i64;
            stmt.execute(params![
                task_id,
                position,
                &item.kind,
                &item.url,
                &item.title,
                &item.description,
                &item.domain,
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn list_for_task(conn: &mut Connection, task_id: &str) -> Result<Vec<StoredSerpItem>> {
    let mut stmt = conn.prepare(
        "SELECT task_id, position, type, url, title, description, domain
           FROM serp_results
          WHERE task_id = $1
          ORDER BY position",
    )?;
    let rows = stmt.query_map([task_id], |row| {
        Ok(StoredSerpItem {
            task_id: row.get(0)?,
            position: row.get::<_, i64>(1)? as i32,
            kind: row.get(2)?,
            url: row.get(3)?,
            title: row.get(4)?,
            description: row.get(5)?,
            domain: row.get(6)?,
        })
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}
