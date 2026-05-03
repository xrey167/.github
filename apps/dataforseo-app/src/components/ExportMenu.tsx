import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { downloadCsv, downloadJson, timestampedFilename } from "../lib/export";

interface Props<T> {
  /// Stem of the filename — gets a timestamp + extension appended.
  filenameStem: string;
  rows: T[];
  columns: ColumnDef<T, unknown>[];
  disabled?: boolean;
}

export default function ExportMenu<T>({ filenameStem, rows, columns, disabled }: Props<T>) {
  const [open, setOpen] = useState(false);

  const onCsv = () => {
    downloadCsv(rows, columns, timestampedFilename(filenameStem, "csv"));
    setOpen(false);
  };

  const onJson = () => {
    downloadJson(rows, timestampedFilename(filenameStem, "json"));
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || rows.length === 0}
        className="rounded border px-2 py-1 text-xs disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Export ▾
      </button>
      {open && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[140px] rounded border bg-white py-1 text-sm shadow"
          >
            <button
              type="button"
              role="menuitem"
              onClick={onCsv}
              className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
            >
              Download CSV
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onJson}
              className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
            >
              Download JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
