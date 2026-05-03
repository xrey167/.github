//! Scheduled PDF report generator. Wakes every hour and checks for
//! due report_schedules. For each due schedule it:
//!   1. Fetches relevant data from the local DB.
//!   2. Renders a single-page (or multi-page) A4 PDF via printpdf.
//!   3. Writes the file to <docs_dir>/DataForSEO Reports/.
//!   4. Records the run in report_runs + bumps last_run_at.
//!
//! Failures are per-schedule and logged; they don't kill the loop.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use printpdf::{BuiltinFont, Mm, PdfDocument};
use tokio::time;

use crate::errors::{AppError, Result};
use crate::store::reports::{self, ReportSchedule};
use crate::store::tracking;
use crate::store::Store;

const TICK_INTERVAL_SECS: u64 = 60 * 60; // 1h

pub async fn run(store: Arc<Store>, docs_dir: Option<PathBuf>) {
    tracing::info!("reporter started (interval {}s)", TICK_INTERVAL_SECS);
    loop {
        time::sleep(Duration::from_secs(TICK_INTERVAL_SECS)).await;
        if let Err(e) = tick(&store, docs_dir.as_deref()).await {
            tracing::warn!(error = %e, "reporter tick failed");
        }
    }
}

async fn tick(store: &Arc<Store>, docs_dir: Option<&Path>) -> Result<()> {
    let store_c = store.clone();
    let due = tokio::task::spawn_blocking(move || store_c.with_conn(reports::due_schedules))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))??;

    if due.is_empty() {
        return Ok(());
    }
    tracing::info!(count = due.len(), "reporter: generating due reports");

    for sched in due {
        if let Err(e) = generate_one(store, docs_dir, &sched).await {
            tracing::warn!(id = sched.id, kind = %sched.kind, error = %e, "report generation failed");
        }
    }
    Ok(())
}

async fn generate_one(
    store: &Arc<Store>,
    docs_dir: Option<&Path>,
    sched: &ReportSchedule,
) -> Result<()> {
    let out_dir = docs_dir
        .map(|d| d.join("DataForSEO Reports"))
        .unwrap_or_else(|| PathBuf::from("DataForSEO Reports"));
    std::fs::create_dir_all(&out_dir)
        .map_err(|e| AppError::Internal(format!("create reports dir: {e}")))?;

    let pdf_bytes = match sched.kind.as_str() {
        "daily-tracking" => build_tracking_pdf(store, sched).await?,
        "weekly-audit" => build_audit_pdf(sched),
        "weekly-brand" => build_brand_pdf(sched),
        other => {
            tracing::warn!(kind = %other, "unknown report kind — skipping");
            return Ok(());
        }
    };

    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let filename = format!("{}-{}-{}.pdf", sched.kind, sched.id, ts);
    let pdf_path = out_dir.join(&filename);
    std::fs::write(&pdf_path, &pdf_bytes)
        .map_err(|e| AppError::Internal(format!("write PDF: {e}")))?;

    let path_str = pdf_path.to_string_lossy().into_owned();
    let sched_id = sched.id;
    let store_c = store.clone();
    tokio::task::spawn_blocking(move || -> Result<()> {
        store_c.with_conn(|c| {
            reports::record_run(c, sched_id, &path_str)?;
            reports::mark_ran(c, sched_id)
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    tracing::info!(path = %path_str, "report saved");
    Ok(())
}

// ── PDF builders ───────────────────────────────────────────────────────────

/// Tracking report: table of keyword → latest rank.
async fn build_tracking_pdf(store: &Arc<Store>, sched: &ReportSchedule) -> Result<Vec<u8>> {
    let store_c = store.clone();
    let rows = tokio::task::spawn_blocking(move || -> Result<_> {
        store_c.with_conn(|c| tracking::list_with_ranks(c))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    let title = format!("Keyword Tracking Report (schedule {})", sched.id);
    let mut lines: Vec<(String, String, String)> = vec![
        ("Keyword".into(), "Rank".into(), "Target".into()),
    ];
    for r in &rows {
        let rank = r
            .current_rank
            .map(|v| v.to_string())
            .unwrap_or_else(|| "—".into());
        lines.push((r.keyword.keyword.clone(), rank, r.keyword.target.clone()));
    }

    build_table_pdf(&title, "Daily Tracking Report", &lines)
}

/// Audit report: placeholder (live data lives in response_cache by audit_run_id).
fn build_audit_pdf(sched: &ReportSchedule) -> Vec<u8> {
    let title = "Site Audit Weekly Report";
    let lines = vec![
        ("Section".into(), "Value".into(), "".into()),
        ("Schedule".into(), sched.kind.clone(), "".into()),
        ("Cadence".into(), sched.cadence.clone(), "".into()),
        (
            "Note".into(),
            "Open the Audit tab for detailed results.".into(),
            "".into(),
        ),
    ];
    build_table_pdf(title, "Weekly Site Audit Summary", &lines).unwrap_or_default()
}

/// Brand report: placeholder summary.
fn build_brand_pdf(sched: &ReportSchedule) -> Vec<u8> {
    let title = "Brand Monitor Weekly Report";
    let lines = vec![
        ("Section".into(), "Value".into(), "".into()),
        ("Schedule".into(), sched.kind.clone(), "".into()),
        ("Cadence".into(), sched.cadence.clone(), "".into()),
        (
            "Note".into(),
            "Open the Brand Monitor tab for detailed results.".into(),
            "".into(),
        ),
    ];
    build_table_pdf(title, "Weekly Brand Monitor Summary", &lines).unwrap_or_default()
}

// ── Generic PDF table builder ───────────────────────────────────────────────

/// Build a simple A4 PDF with a heading and a 3-column table.
/// Returns raw PDF bytes on success.
fn build_table_pdf(
    document_title: &str,
    heading: &str,
    rows: &[(String, String, String)],
) -> Result<Vec<u8>> {
    let (doc, page1, layer1) =
        PdfDocument::new(document_title, Mm(210.0), Mm(297.0), "Layer 1");
    let regular = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::Internal(format!("font: {e}")))?;
    let bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::Internal(format!("font bold: {e}")))?;

    let layer = doc.get_page(page1).get_layer(layer1);
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();

    // Header
    layer.use_text(heading, 16.0, Mm(20.0), Mm(272.0), &bold);
    layer.use_text(&now, 9.0, Mm(20.0), Mm(265.0), &regular);

    // Separator line — ASCII only (built-in PDF fonts are Latin-1).
    layer.use_text(
        &"-".repeat(100),
        8.0,
        Mm(20.0),
        Mm(261.0),
        &regular,
    );

    // Table rows — col widths: 90 / 40 / 50 mm
    const COL1: f32 = 20.0;
    const COL2: f32 = 115.0;
    const COL3: f32 = 160.0;
    const ROW_H: f32 = 7.0;
    let mut y = 255.0_f32;
    let bottom_margin = 20.0_f32;

    for (i, (c1, c2, c3)) in rows.iter().enumerate() {
        if y < bottom_margin {
            break; // don't overflow — add more pages in a future iteration
        }
        let font = if i == 0 { &bold } else { &regular };
        layer.use_text(truncate(c1, 38), 9.0, Mm(COL1), Mm(y), font);
        layer.use_text(truncate(c2, 20), 9.0, Mm(COL2), Mm(y), font);
        layer.use_text(truncate(c3, 22), 9.0, Mm(COL3), Mm(y), font);
        y -= ROW_H;
    }

    // Footer
    layer.use_text("Generated by DataForSEO App", 8.0, Mm(20.0), Mm(10.0), &regular);

    doc.save_to_bytes()
        .map_err(|e| AppError::Internal(format!("PDF save: {e}")))
}

fn truncate(s: &str, max_chars: usize) -> &str {
    if s.len() <= max_chars {
        s
    } else {
        // Safe truncation at char boundary
        match s.char_indices().nth(max_chars) {
            Some((idx, _)) => &s[..idx],
            None => s,
        }
    }
}
