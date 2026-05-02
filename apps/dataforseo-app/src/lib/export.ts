//! Client-side CSV / JSON export for ResultsTable.
//!
//! Frontend-only — all data is already in React state by the time the user
//! can click "Download". The Rust backend has nothing to do here.

import type { ColumnDef } from "@tanstack/react-table";

/// RFC 4180-ish CSV cell escape: wrap in double-quotes if the value contains
/// comma, quote, or newline; embedded quotes are doubled.
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/// Resolve a column header to a string. tanstack-table allows the header to
/// be a string, function, or React node; we want the same label that's
/// painted in the UI for free-form headers and fall back to the column id.
function headerLabel<T>(column: ColumnDef<T, unknown>): string {
  if (typeof column.header === "string") return column.header;
  return String(column.id ?? "");
}

/// Resolve a row's value for one column. Honors accessorFn first (custom
/// projections), then accessorKey (declarative field access). Returns ""
/// for unresolved cells so the CSV stays well-formed.
function cellValue<T>(column: ColumnDef<T, unknown>, row: T, index: number): string {
  type WithFn = { accessorFn?: (row: T, index: number) => unknown };
  type WithKey = { accessorKey?: string };
  const fn = (column as WithFn).accessorFn;
  if (typeof fn === "function") {
    const v = fn(row, index);
    return v == null ? "" : String(v);
  }
  const key = (column as WithKey).accessorKey;
  if (typeof key === "string") {
    const v = (row as Record<string, unknown>)[key];
    return v == null ? "" : String(v);
  }
  return "";
}

function triggerBlobDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv<T>(
  rows: T[],
  columns: ColumnDef<T, unknown>[],
  filename: string,
): void {
  const header = columns.map((c) => csvEscape(headerLabel(c))).join(",");
  const body = rows
    .map((r, i) => columns.map((c) => csvEscape(cellValue(c, r, i))).join(","))
    .join("\n");
  triggerBlobDownload(`${header}\n${body}\n`, filename, "text/csv;charset=utf-8");
}

export function downloadJson<T>(rows: T[], filename: string): void {
  triggerBlobDownload(JSON.stringify(rows, null, 2), filename, "application/json");
}

/// Stamp a filename with a sortable timestamp so users can collect repeat
/// exports without overwriting.
export function timestampedFilename(stem: string, ext: "csv" | "json"): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${stem}-${stamp}.${ext}`;
}
