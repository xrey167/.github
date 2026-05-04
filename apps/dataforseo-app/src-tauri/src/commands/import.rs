//! SEMrush CSV import: populate local caches from exported SEMrush reports
//! to avoid redundant DataForSEO API calls for data the user already has.
//!
//! Supported export types (auto-detected from the header row):
//!  - **keyword_overview**: Keyword Magic Tool / Keyword Overview exports.
//!    Populates `keyword_volume_cache` with volume, KD, and CPC.
//!  - **organic_positions**: Organic Research → Positions exports.
//!    Populates `keyword_volume_cache` AND, when a target domain is provided,
//!    `tracked_keywords` + `tracking_results` for the position history.

use serde::{Deserialize, Serialize};
use tauri::State;
use ts_rs::TS;

use crate::errors::{AppError, Result};
use crate::state::AppState;
use crate::store;
use crate::store::keywords_cache::KeywordVolume;

// ── Result types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct SemrushImportResult {
    /// `"keyword_overview"` or `"organic_positions"`
    pub import_type: String,
    /// Total data rows successfully parsed.
    pub rows_imported: i64,
    /// How many keyword-volume rows were written to the local cache.
    pub keywords_cached: i64,
    /// How many position records were added to the tracking history.
    pub positions_recorded: i64,
    /// Estimated DataForSEO cost saved (USD) by using the cached data.
    pub cost_saved_usd: f64,
    /// Non-fatal issues noticed during parsing.
    pub warnings: Vec<String>,
}

// ── Command handlers ──────────────────────────────────────────────────────────

/// Parse and import a SEMrush CSV export.
///
/// `csv_content`    — raw UTF-8 file content (read by the frontend).
/// `filename`       — original filename, stored in the import history.
/// `location_code`  — DataForSEO location code for the cache key (e.g. 2276 = Germany).
/// `language_code`  — DataForSEO language code (e.g. "de").
/// `target`         — root domain for position imports (e.g. "acme.com").
///                    Required to record positions in the tracker; optional otherwise.
#[tauri::command]
pub async fn semrush_import(
    state: State<'_, AppState>,
    csv_content: String,
    filename: String,
    location_code: u32,
    language_code: String,
    target: Option<String>,
) -> Result<SemrushImportResult> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || {
        store.with_conn(|conn| {
            do_import(conn, &csv_content, &filename, location_code, &language_code, target.as_deref())
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

/// Return the import history (last 100 imports, newest first).
#[tauri::command]
pub async fn semrush_list_imports(
    state: State<'_, AppState>,
) -> Result<Vec<store::semrush_import::SemrushImport>> {
    let store = state.store.clone();
    tokio::task::spawn_blocking(move || store.with_conn(store::semrush_import::list))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

// ── Core import logic ─────────────────────────────────────────────────────────

fn do_import(
    conn: &mut duckdb::Connection,
    content: &str,
    filename: &str,
    location_code: u32,
    language_code: &str,
    target: Option<&str>,
) -> Result<SemrushImportResult> {
    let mut warnings: Vec<String> = Vec::new();

    // ── Detect delimiter ──────────────────────────────────────────────────
    // SEMrush exports use `;` for European locales, `,` for en-US.
    let first_line = content.lines().next().unwrap_or("");
    let semi_count = first_line.chars().filter(|&c| c == ';').count();
    let comma_count = first_line.chars().filter(|&c| c == ',').count();
    let delim = if semi_count >= comma_count { b';' } else { b',' };

    // ── Map header names → column indices ─────────────────────────────────
    let header_lc: Vec<String> = split_line(first_line, delim)
        .into_iter()
        .map(|s| s.to_lowercase())
        .collect();

    macro_rules! col {
        ($($name:expr),+) => {
            [$($name),+]
                .iter()
                .find_map(|&n| header_lc.iter().position(|h| h.trim() == n))
        };
    }

    let kw_col  = col!("keyword");
    let vol_col = col!("volume", "search volume");
    let kd_col  = col!("kd %", "keyword difficulty");
    let cpc_col = col!("cpc (usd)", "cpc");
    let pos_col = col!("position");
    let url_col = col!("url");

    if kw_col.is_none() {
        return Err(AppError::Validation(
            "CSV has no 'Keyword' column — is this a SEMrush export?".into(),
        ));
    }
    if vol_col.is_none() && pos_col.is_none() {
        return Err(AppError::Validation(
            "CSV has neither a Volume nor a Position column — unsupported export type.".into(),
        ));
    }

    let is_positions = pos_col.is_some();
    let import_type = if is_positions { "organic_positions" } else { "keyword_overview" };

    // ── Parse data rows ───────────────────────────────────────────────────
    let mut volume_rows: Vec<KeywordVolume> = Vec::new();
    // (keyword, rank_absolute, url)
    let mut position_rows: Vec<(String, Option<i32>, Option<String>)> = Vec::new();
    let mut skipped: u64 = 0;

    for line in content.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let fields = split_line(line, delim);

        let keyword = kw_col
            .and_then(|i| fields.get(i))
            .map(|s| s.trim().to_owned())
            .filter(|s| !s.is_empty());

        let keyword = match keyword {
            Some(k) => k,
            None => {
                skipped += 1;
                continue;
            }
        };

        let search_volume = vol_col
            .and_then(|i| fields.get(i))
            .and_then(|s| parse_integer(s.trim()));

        let competition_index = kd_col
            .and_then(|i| fields.get(i))
            .and_then(|s| parse_integer(s.trim()))
            .map(|v| v.clamp(0, 100) as i32);

        let cpc = cpc_col
            .and_then(|i| fields.get(i))
            .and_then(|s| parse_float(s.trim()));

        volume_rows.push(KeywordVolume {
            keyword: keyword.clone(),
            search_volume,
            competition: None,
            competition_index,
            cpc,
            low_top_of_page_bid: None,
            high_top_of_page_bid: None,
            monthly_searches: None,
            from_cache: true,
        });

        if is_positions {
            let position = pos_col
                .and_then(|i| fields.get(i))
                .and_then(|s| parse_integer(s.trim()))
                .map(|v| v.clamp(1, 200) as i32);
            let url = url_col
                .and_then(|i| fields.get(i))
                .map(|s| s.trim().to_owned())
                .filter(|s| !s.is_empty());
            position_rows.push((keyword, position, url));
        }
    }

    if skipped > 0 {
        warnings.push(format!("{skipped} rows skipped (empty or unparseable keyword)"));
    }

    // ── Write keyword volume cache ────────────────────────────────────────
    let keywords_cached = volume_rows.len() as i64;
    store::keywords_cache::put_batch(conn, location_code, language_code, &volume_rows)?;

    // ── Write position tracking data ──────────────────────────────────────
    // All position upserts run in a single transaction via import_positions_batch
    // so a failure leaves the database in a consistent state.
    let mut positions_recorded: i64 = 0;
    if is_positions && !position_rows.is_empty() {
        match target {
            None | Some("") => {
                warnings.push(
                    "No target domain provided — position data was not saved to the tracker."
                        .into(),
                );
            }
            Some(t) => {
                positions_recorded = store::tracking::import_positions_batch(
                    conn,
                    t,
                    location_code,
                    language_code,
                    &position_rows,
                )?;
            }
        }
    }

    // ── Cost saved estimate ───────────────────────────────────────────────
    // DataForSEO keywords/data (standard) ≈ $0.001/kw; SERP live ≈ $0.001/call.
    let cost_saved_usd =
        (keywords_cached as f64) * 0.001 + (positions_recorded as f64) * 0.001;

    // ── Record import in history ──────────────────────────────────────────
    store::semrush_import::record(
        conn,
        filename,
        import_type,
        keywords_cached,
        location_code as i32,
        language_code,
        cost_saved_usd,
    )?;

    Ok(SemrushImportResult {
        import_type: import_type.to_owned(),
        rows_imported: keywords_cached,
        keywords_cached,
        positions_recorded,
        cost_saved_usd,
        warnings,
    })
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

/// Split one CSV line by `delim`, stripping surrounding double-quotes.
/// Handles quoted fields (e.g. `"keyword, with, comma"`) but not embedded
/// newlines (SEMrush doesn't produce those).
fn split_line(line: &str, delim: u8) -> Vec<String> {
    let mut fields: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let d = delim as char;

    for ch in line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c == d && !in_quotes => {
                fields.push(current.trim().to_owned());
                current = String::new();
            }
            c => current.push(c),
        }
    }
    fields.push(current.trim().to_owned());
    fields
}

/// Parse an integer that may contain thousands-separator commas or spaces.
/// Returns `None` for `""`, `"--"`, `"N/A"`, and non-numeric strings.
fn parse_integer(s: &str) -> Option<i64> {
    if s.is_empty() || s == "--" || s.to_ascii_lowercase() == "n/a" {
        return None;
    }
    // Strip everything that's not a digit or a minus sign.
    let cleaned: String = s.chars().filter(|c| c.is_ascii_digit() || *c == '-').collect();
    cleaned.parse().ok()
}

/// Parse a decimal number (`.` as decimal separator).
/// Strips thousands-separator commas and non-numeric characters.
fn parse_float(s: &str) -> Option<f64> {
    if s.is_empty() || s == "--" || s.to_ascii_lowercase() == "n/a" {
        return None;
    }
    let cleaned: String = s
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
        .collect();
    cleaned.parse().ok()
}
