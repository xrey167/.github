import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import { formatError } from "../lib/errors";
import { formatUsd } from "../lib/format";
import { tauriApi, type AuditRun } from "../lib/tauri";
import AuditRunDetail from "./audit/AuditRunDetail";

const PRESET_PAGE_LIMITS = [50, 100, 200, 500, 1000];

export default function AuditPage() {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("");
  const [maxPages, setMaxPages] = useState(100);
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const list = await tauriApi.auditList({ limit: 50 });
      setRuns(list);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // Poll the runs list every 30s so pending crawls flip to ready in
    // the UI without the user having to refresh manually.
    const t = window.setInterval(reload, 30_000);
    return () => window.clearInterval(t);
  }, []);

  async function onStart() {
    if (!target.trim()) return;
    setStarting(true);
    try {
      const id = await tauriApi.auditStart({
        target: target.trim(),
        maxCrawlPages: maxPages,
      });
      toast.success(`Audit started · run #${id}`);
      setTarget("");
      await reload();
      setSelected(id);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setStarting(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Delete this audit run? Pages will be removed too.")) return;
    try {
      await tauriApi.auditDelete({ id });
      toast.success("Deleted");
      if (selected === id) setSelected(null);
      await reload();
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selected) ?? null,
    [runs, selected],
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Site Audit</h2>
        <p className="text-sm text-slate-600">
          Multi-page SEO crawl via the DataForSEO On-Page task pipeline. Each crawl runs in the
          background; this page polls every 30 seconds. 0.000125 USD per page (≈ 0.0125 USD for a
          100-page crawl).
        </p>
      </header>

      <div className="rounded border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Start audit</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_320px]">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">Target domain</span>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={starting}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="https://example.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">Max pages</span>
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
              disabled={starting}
              className="rounded border px-2 py-1 text-sm"
            >
              {PRESET_PAGE_LIMITS.map((n) => (
                <option key={n} value={n}>
                  {n} pages
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <CostPreview
              action={{ kind: "OnPageAudit", max_pages: maxPages }}
              details={[
                `${maxPages} pages × 0.000125 USD`,
                "Crawl runs in background; poll every 30s",
              ]}
              disabled={starting || !target.trim()}
            />
            <button
              type="button"
              onClick={onStart}
              disabled={starting || !target.trim()}
              className="self-stretch rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {starting ? "Starting…" : "Start"}
            </button>
          </div>
        </div>
      </div>

      {loading && runs.length === 0 ? (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          No audits yet. Start one above.
        </div>
      ) : (
        <div className="rounded border bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Target</th>
                <th className="px-3 py-2 text-left">Started</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Pages</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <RunRow
                  key={r.id}
                  run={r}
                  expanded={selected === r.id}
                  onToggle={() => setSelected(selected === r.id ? null : r.id)}
                  onDelete={() => onDelete(r.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRun && selectedRun.status === "ready" && (
        <AuditRunDetail run={selectedRun} />
      )}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : status === "running" || status === "pending"
        ? "bg-amber-100 text-amber-800"
        : status === "failed"
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>
  );
}

function RunRow({
  run,
  expanded,
  onToggle,
  onDelete,
}: {
  run: AuditRun;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="cursor-pointer border-t hover:bg-slate-50" onClick={onToggle}>
      <td className="px-3 py-2 font-mono">{run.target}</td>
      <td className="px-3 py-2 text-slate-500">
        {run.started_at ? run.started_at.slice(0, 16) : "—"}
      </td>
      <td className="px-3 py-2">
        <StatusPill status={run.status} />
        {run.error && (
          <div className="mt-1 text-[11px] text-red-700" title={run.error}>
            {run.error.slice(0, 60)}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {run.page_count} / {run.max_crawl_pages}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {run.cost_usd != null ? formatUsd(run.cost_usd) : "—"}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
        >
          ✕
        </button>
        <span className="ml-2 text-slate-400">{expanded ? "▾" : "▸"}</span>
      </td>
    </tr>
  );
}
