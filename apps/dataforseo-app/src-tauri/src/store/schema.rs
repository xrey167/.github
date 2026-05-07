//! Schema migrations. Append-only: never edit a committed migration file.

use duckdb::Connection;

use crate::errors::Result;

const MIGRATIONS: &[(u32, &str)] = &[
    (1, include_str!("../../migrations/v0001_initial.sql")),
    (2, include_str!("../../migrations/v0002_ai_chat.sql")),
    (3, include_str!("../../migrations/v0003_backlinks.sql")),
    (4, include_str!("../../migrations/v0004_response_cache.sql")),
    (5, include_str!("../../migrations/v0005_position_tracking.sql")),
    (6, include_str!("../../migrations/v0006_site_audit.sql")),
    (7, include_str!("../../migrations/v0007_projects.sql")),
    (8, include_str!("../../migrations/v0008_reports.sql")),
    (9, include_str!("../../migrations/v0009_semrush_import.sql")),
    (10, include_str!("../../migrations/v0010_content_strategy.sql")),
];

pub fn ensure_current(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (key VARCHAR PRIMARY KEY, value VARCHAR NOT NULL);",
    )?;

    let current: u32 = conn
        .query_row(
            "SELECT COALESCE(MAX(CAST(value AS INTEGER)), 0) FROM settings WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    for (version, sql) in MIGRATIONS {
        if *version <= current {
            continue;
        }
        conn.execute_batch(sql)?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('schema_version', ?)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            duckdb::params![version.to_string()],
        )?;
    }
    Ok(())
}
