import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type GapKeyword, type KeywordGapView } from "../../lib/tauri";

const BUCKETS = [
  { id: "missing", label: "Missing", desc: "Competitor ranks, you don't" },
  { id: "weak", label: "Weak", desc: "Both rank, competitor outranks you" },
  { id: "strong", label: "Strong", desc: "Both rank, you outrank competitor" },
  { id: "unique", label: "Unique", desc: "You rank, competitor doesn't" },
] as const;

type Bucket = (typeof BUCKETS)[number]["id"];

const BUCKET_COLOR: Record<Bucket, string> = {
  missing: "bg-red-100 text-red-800",
  weak: "bg-amber-100 text-amber-800",
  strong: "bg-emerald-100 text-emerald-800",
  unique: "bg-sky-100 text-sky-800",
};

export default function KeywordGapTab() {
  const [yours, setYours] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<KeywordGapView | null>(null);
  const [activeBucket, setActiveBucket] = useState<Bucket>("missing");

  const yt = yours.trim();
  const ct = competitor.trim();
  const canRun = yt.length > 0 && ct.length > 0;

  async function onRun(useCache: boolean) {
    if (!canRun) return;
    setBusy(true);
    try {
      const result = await tauriApi.keywordGap({
        yours: yt,
        competitor: ct,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: 1000,
        useCache,
      });
      setView(result);
      toast.success(
        `${result.missing_count} missing · ${result.weak_count} weak · ${result.strong_count} strong (${formatUsd(result.cost_usd)})`,
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo<GapKeyword[]>(
    () => (view ? view.items.filter((k) => k.bucket === activeBucket) : []),
    [view, activeBucket],
  );

  const exportColumns = useMemo<ColumnDef<GapKeyword, unknown>[]>(
    () => [
      { id: "keyword", header: "Keyword", accessorKey: "keyword" },
      { id: "bucket", header: "Bucket", accessorKey: "bucket" },
      { id: "search_volume", header: "Volume", accessorKey: "search_volume" },
      { id: "keyword_difficulty", header: "KD", accessorKey: "keyword_difficulty" },
      { id: "cpc", header: "CPC", accessorKey: "cpc" },
      { id: "rank_yours", header: "Your Rank", accessorKey: "rank_yours" },
      { id: "rank_theirs", header: "Their Rank", accessorKey: "rank_theirs" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Compares keywords two domains rank for. <strong>Missing</strong> shows the SEMrush
        "keyword gap" — keywords your competitor ranks for that you don't. Cost: 2× ranked_keywords
        (0.025 USD total, or $0 if both are cached).
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Your domain</span>
          <input
            type="text"
            value={yours}
            onChange={(e) => setYours(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="yourdomain.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Competitor</span>
          <input
            type="text"
            value={competitor}
            onChange={(e) => setCompetitor(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="competitor.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "KeywordsForDomain", mode: "live" }}
            details={["2× ranked_keywords call", "0.0125 each = 0.025 USD total", "$0 on cache hit"]}
            disabled={!canRun || busy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !canRun}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Comparing…" : "Compare"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || !canRun}
              title="Bypass cache"
              className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {view && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {view.yours} vs {view.competitor} · actual {formatUsd(view.cost_usd)} · estimated{" "}
              {formatUsd(view.estimated_usd)}
            </span>
            <span className="ml-auto">
              <ExportMenu
                // Match the visible bucket — exporting the full union
                // would surprise the user since the on-screen table is
                // already scoped to one of missing/weak/strong/unique.
                filenameStem={`keyword-gap-${view.yours}-vs-${view.competitor}-${activeBucket}`}
                rows={filtered}
                columns={exportColumns}
              />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUCKETS.map((b) => {
              const count =
                b.id === "missing"
                  ? view.missing_count
                  : b.id === "weak"
                    ? view.weak_count
                    : b.id === "strong"
                      ? view.strong_count
                      : view.unique_count;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBucket(b.id)}
                  className={`rounded border p-3 text-left transition ${
                    activeBucket === b.id
                      ? "border-slate-800 bg-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${BUCKET_COLOR[b.id]}`}>
                      {b.label}
                    </span>
                    <span className="text-lg font-semibold tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{b.desc}</p>
                </button>
              );
            })}
          </div>

          {filtered.length > 0 ? (
            <div className="overflow-x-auto rounded border bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-1 text-left">Keyword</th>
                    <th className="px-2 py-1 text-right">Vol</th>
                    <th className="px-2 py-1 text-right">KD</th>
                    <th className="px-2 py-1 text-right">CPC</th>
                    <th className="px-2 py-1 text-right">You</th>
                    <th className="px-2 py-1 text-right">Them</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-slate-50">
                      <td className="px-2 py-1 font-mono">{row.keyword}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {row.search_volume?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {row.keyword_difficulty ?? "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {row.cpc != null ? formatUsd(row.cpc) : "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{row.rank_yours ?? "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{row.rank_theirs ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
              No keywords in the {activeBucket} bucket.
            </div>
          )}
        </>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter your domain and a competitor above and click Compare.
        </div>
      )}
    </div>
  );
}
