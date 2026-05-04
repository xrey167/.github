import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { useProject } from "../lib/project-store";
import {
  tauriApi,
  type SemrushImport,
  type SemrushImportResult,
} from "../lib/tauri";

// Common DataForSEO location/language combos
const LOCATIONS = [
  { code: 2276, label: "Germany" },
  { code: 2840, label: "United States" },
  { code: 2826, label: "United Kingdom" },
  { code: 2036, label: "Australia" },
  { code: 2040, label: "Austria" },
  { code: 2756, label: "Switzerland" },
  { code: 2250, label: "France" },
  { code: 2724, label: "Spain" },
  { code: 2380, label: "Italy" },
  { code: 2616, label: "Poland" },
];

const LANGUAGES = [
  { code: "de", label: "German" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pl", label: "Polish" },
];

const TYPE_LABELS: Record<string, string> = {
  keyword_overview: "Keyword Overview / Magic Tool",
  organic_positions: "Organic Research → Positions",
};

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`;
}

export default function ImportPage() {
  const { active: project, projects } = useProject();

  const [locationCode, setLocationCode] = useState(DEFAULT_LOCATION);
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SemrushImportResult | null>(null);
  const [history, setHistory] = useState<SemrushImport[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default target to active project
  useEffect(() => {
    if (project && !target) {
      setTarget(project.target);
    }
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await tauriApi.semrushListImports());
    } catch {
      // history is non-critical, fail silently
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error("Please select a CSV file exported from SEMrush.");
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const csvContent = await file.text();
      const res = await tauriApi.semrushImport({
        csvContent,
        filename: file.name,
        locationCode,
        languageCode,
        target: target.trim() || undefined,
      });
      setResult(res);
      if (res.warnings.length) {
        res.warnings.forEach((w) => toast(w, { icon: "⚠️" }));
      }
      toast.success(
        `Imported ${fmt(res.keywords_cached)} keywords${
          res.positions_recorded > 0 ? ` + ${fmt(res.positions_recorded)} positions` : ""
        }`,
      );
      await loadHistory();
    } catch (e) {
      toast.error(formatError(e, "Import"));
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section className="flex max-w-3xl flex-col gap-6 p-6">
      <header>
        <h2 className="text-xl font-semibold">Import from SEMrush</h2>
        <p className="mt-1 text-sm text-slate-600">
          Import your SEMrush CSV exports to populate the local keyword cache — avoiding
          redundant DataForSEO API calls for data you already have.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Supported: <strong>Keyword Magic Tool</strong> exports (volume, KD, CPC) and{" "}
          <strong>Organic Research → Positions</strong> exports (volume + rank history).
        </p>
      </header>

      {/* Configuration */}
      <div className="rounded border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Import settings</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Location</span>
            <select
              value={locationCode}
              onChange={(e) => setLocationCode(Number(e.target.value))}
              className="rounded border px-2 py-1 text-sm"
            >
              {LOCATIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Language</span>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">
              Target domain{" "}
              <span className="text-slate-400">(for Positions imports only)</span>
            </span>
            {projects.length > 0 ? (
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="">— none —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.target}>
                    {p.name} ({p.target})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. example.com"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              />
            )}
          </label>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        aria-label="Drop CSV file or click to browse"
      >
        <span className="text-3xl">📂</span>
        {busy ? (
          <span className="text-sm text-slate-600">Importing…</span>
        ) : (
          <>
            <span className="text-sm font-medium text-slate-700">
              Drop SEMrush CSV here or click to browse
            </span>
            <span className="text-xs text-slate-500">
              Export from: Analytics → Export → CSV in the SEMrush interface
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={onFileChange}
          disabled={busy}
        />
      </div>

      {/* Result card */}
      {result && (
        <div className="rounded border border-green-200 bg-green-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-green-800">Import successful</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <Stat label="Format" value={TYPE_LABELS[result.import_type] ?? result.import_type} />
            <Stat label="Keywords cached" value={fmt(result.keywords_cached)} />
            {result.positions_recorded > 0 && (
              <Stat label="Positions recorded" value={fmt(result.positions_recorded)} />
            )}
            <Stat
              label="Estimated cost saved"
              value={fmtCost(result.cost_saved_usd)}
              highlight
            />
          </div>
          {result.warnings.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-xs text-amber-700">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Import history */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Import history</h3>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">File</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Rows</th>
                  <th className="px-3 py-2 text-right font-medium">Cost saved</th>
                  <th className="px-3 py-2 text-left font-medium">Imported</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="max-w-[200px] truncate px-3 py-2 font-mono">{h.filename}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {TYPE_LABELS[h.import_type] ?? h.import_type}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(h.rows_imported)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">
                      {fmtCost(h.cost_saved_usd)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {h.imported_at ? new Date(h.imported_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works */}
      <details className="rounded border bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          How does this work?
        </summary>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            Imported keywords are written directly into the local keyword volume cache with the
            location and language you selected. The next time you look up those keywords in the
            Keywords or Tracking pages, the app will return the cached data instead of calling
            DataForSEO — saving you money.
          </p>
          <p>
            <strong>Keyword Magic / Overview exports</strong> populate the volume, keyword
            difficulty (→ competition index), and CPC fields.
          </p>
          <p>
            <strong>Organic Research → Positions exports</strong> additionally create tracking
            entries in the position tracker, giving you historical baseline data for the target
            domain you select above.
          </p>
          <p className="text-xs text-slate-500">
            Cost saving estimate uses $0.001/keyword (DataForSEO standard keywords endpoint rate).
          </p>
        </div>
      </details>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-medium ${highlight ? "text-green-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
