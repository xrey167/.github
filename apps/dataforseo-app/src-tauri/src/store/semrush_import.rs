use duckdb::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SemrushImport {
    pub id: i64,
    pub filename: String,
    pub import_type: String,
    pub rows_imported: i64,
    pub location_code: Option<i32>,
    pub language_code: Option<String>,
    pub cost_saved_usd: f64,
    pub imported_at: Option<String>,
}

pub fn record(
    conn: &mut Connection,
    filename: &str,
    import_type: &str,
    rows_imported: i64,
    location_code: i32,
    language_code: &str,
    cost_saved_usd: f64,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO semrush_imports
            (filename, import_type, rows_imported, location_code, language_code, cost_saved_usd)
         VALUES ($1, $2, $3, $4, $5, $6)",
        params![filename, import_type, rows_imported, location_code, language_code, cost_saved_usd],
    )?;
    let id: i64 = conn.query_row(
        "SELECT MAX(id) FROM semrush_imports",
        [],
        |row| row.get(0),
    )?;
    Ok(id)
}

pub fn list(conn: &mut Connection) -> Result<Vec<SemrushImport>> {
    let mut stmt = conn.prepare(
        "SELECT id, filename, import_type, rows_imported, location_code, language_code,
                cost_saved_usd, CAST(imported_at AS VARCHAR)
           FROM semrush_imports
          ORDER BY imported_at DESC
          LIMIT 100",
    )?;
    let mut rows = stmt.query([])?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        out.push(SemrushImport {
            id: row.get(0)?,
            filename: row.get(1)?,
            import_type: row.get(2)?,
            rows_imported: row.get(3)?,
            location_code: row.get::<_, Option<i64>>(4)?.map(|v| v as i32),
            language_code: row.get(5)?,
            cost_saved_usd: row.get(6)?,
            imported_at: row.get(7)?,
        });
    }
    Ok(out)
}
