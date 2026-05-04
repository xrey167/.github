import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";

import CostPreview from "../components/CostPreview";
import ExportMenu from "../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { tauriApi, type TrackedKeywordWithRank } from "../lib/tauri";
import TrackingRow from "./tracking/TrackingRow";

interface TrackingExportRow {
  target: string;
  keyword: string;
  frequency: string;
  current_rank: number | null;
  previous_rank: number | null;
  current_url: string | null;
  last_run_at: string | null;
}

const TRACKING_COLUMNS: ColumnDef<TrackingExportRow, unknown>[] = [
  { header: "Target", accessorKey: "target" },
  { header: "Keyword", accessorKey: "keyword" },
  { header: "Frequency", accessorKey: "frequency" },
  { header: "Current Rank", accessorKey: "current_rank" },
  { header: "Previous Rank", accessorKey: "previous_rank" },
  { header: "URL", accessorKey: "current_url" },
  { header: "Last Run", accessorKey: "last_run_at" },
];

type Frequency = "daily" | "weekly" | "manual";

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackedKeywordWithRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("");
  const [keyword, setKeyword] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [adding, setAdding] = useState(false);

  const exportRows = useMemo<TrackingExportRow[]>(
    () =>
      rows.map((r) => ({
        target: r.keyword.target,
        keyword: r.keyword.keyword,
        frequency: r.keyword.frequency,
        current_rank: r.current_rank,
        previous_rank: r.previous_rank,
        current_url: r.current_url,
        last_run_at: r.keyword.last_run_at,
      })),
    [rows],
  );

  async function reload() {
    setLoading(true);
    try {
      const list = await tauriApi.trackingList();
      setRows(list);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onAdd() {
    if (!target.trim() || !keyword.trim()) return;
    setAdding(true);
    try {
      await tauriApi.trackingAdd({
        target: target.trim(),
        keyword: keyword.trim(),
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        frequency,
      });
      setKeyword("");
      toast.success(`Tracking ${keyword.trim()}`);
      await reload();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setAdding(false);
    }
  }

  async function onRemove(id: number) {
    if (!window.confirm("Remove tracked keyword? History will be deleted too.")) return;
    try {
      await tauriApi.trackingRemove({ id });
      toast.success("Removed");
      await reload();
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  async function onRunNow(id: number) {
    try {
      await tauriApi.trackingRunNow({ id });
      toast.success("Refreshed");
      await reload();
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Position Tracking</h2>
        <p className="text-sm text-slate-600">
          Daily SERP rank monitoring. Each tracked keyword runs through the SERP organic Live
          endpoint at the configured cadence (0.002 USD per check). 100 keywords daily ≈ 6 USD/month.
        </p>
      </header>

      <div className="rounded border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Add keyword</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_140px_320px]">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">Target domain</span>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={adding}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="yourdomain.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">Keyword</span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={adding}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="seo tools"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">Frequency</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              disabled={adding}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual only</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <CostPreview
              action={{ kind: "Serp", count: 1, mode: "live", depth: 100, extra_params: 0 }}
              details={[
                "0.002 USD per check (depth 100)",
                frequency === "daily"
                  ? "≈ 0.06 USD/month per keyword"
                  : frequency === "weekly"
                    ? "≈ 0.009 USD/month per keyword"
                    : "Charged only on manual refresh",
              ]}
              disabled={adding || !target.trim() || !keyword.trim()}
            />
            <button
              type="button"
              onClick={onAdd}
              disabled={adding || !target.trim() || !keyword.trim()}
              className="self-stretch rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          No tracked keywords yet. Add one above to start monitoring.
        </div>
      ) : (
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-slate-600">{rows.length} keywords tracked</span>
            <ExportMenu
              filenameStem="tracking"
              rows={exportRows}
              columns={TRACKING_COLUMNS}
            />
          </div>
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Target</th>
                <th className="px-3 py-2 text-left">Keyword</th>
                <th className="px-3 py-2 text-right">Rank</th>
                <th className="px-3 py-2 text-right">Δ</th>
                <th className="px-3 py-2 text-left">Frequency</th>
                <th className="px-3 py-2 text-left">Last check</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TrackingRow
                  key={row.keyword.id}
                  row={row}
                  onRemove={onRemove}
                  onRunNow={onRunNow}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
