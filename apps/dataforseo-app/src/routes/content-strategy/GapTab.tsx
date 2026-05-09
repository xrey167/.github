import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatError } from "../../lib/errors";
import { formatUsd } from "../../lib/format";
import {
  tauriApi,
  type GapKeyword,
  type KeywordGapView,
  type PlannedPostInput,
  type TopicCluster,
} from "../../lib/tauri";

interface Props {
  clusters: TopicCluster[];
  defaultProjectId: number | null;
  defaultDomain?: string;
  onAddPost: (input: PlannedPostInput) => void | Promise<void>;
}

const BUCKET_COLOR: Record<string, string> = {
  missing: "bg-red-100 text-red-800",
  weak: "bg-amber-100 text-amber-800",
  strong: "bg-emerald-100 text-emerald-800",
  unique: "bg-sky-100 text-sky-800",
};

export default function GapTab({
  clusters,
  defaultProjectId,
  defaultDomain,
  onAddPost,
}: Props) {
  const [yours, setYours] = useState(defaultDomain ?? "");
  const [competitor, setCompetitor] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<KeywordGapView | null>(null);
  const [clusterId, setClusterId] = useState<string>("");
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());

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
      setAddedKeywords(new Set());
      toast.success(
        `${result.missing_count} missing · ${result.weak_count} weak (${formatUsd(result.cost_usd)})`,
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  // Content-strategy GapTab focuses on the "missing" bucket — that's
  // where the planning value is. The full bucket explorer lives at
  // /domain → Keyword Gap.
  const missing = useMemo<GapKeyword[]>(
    () => (view ? view.items.filter((k) => k.bucket === "missing") : []),
    [view],
  );

  const exportColumns = useMemo<ColumnDef<GapKeyword, unknown>[]>(
    () => [
      { id: "keyword", header: "Keyword", accessorKey: "keyword" },
      { id: "search_volume", header: "Volume", accessorKey: "search_volume" },
      { id: "keyword_difficulty", header: "KD", accessorKey: "keyword_difficulty" },
      { id: "cpc", header: "CPC", accessorKey: "cpc" },
      { id: "rank_theirs", header: "Their Rank", accessorKey: "rank_theirs" },
    ],
    [],
  );

  async function addAsPost(k: GapKeyword) {
    const input: PlannedPostInput = {
      project_id: defaultProjectId,
      cluster_id: clusterId ? Number(clusterId) : null,
      title: k.keyword,
      target_keyword: k.keyword,
      status: "idea",
      scheduled_for: null,
      notes: view
        ? `Gap vs ${view.competitor}. Vol ${k.search_volume ?? "?"}, KD ${k.keyword_difficulty ?? "?"}, their rank #${k.rank_theirs ?? "?"}.`
        : null,
    };
    await onAddPost(input);
    setAddedKeywords((prev) => {
      const next = new Set(prev);
      next.add(k.keyword);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Find keywords your competitor ranks for that you don't, then queue them
        as planned posts in one click. Uses DataForSEO Labs (2× ranked_keywords
        ≈ $0.025, $0 on cache hit).
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
            details={[
              "2× ranked_keywords call",
              "0.0125 each = 0.025 USD total",
              "$0 on cache hit",
            ]}
            disabled={!canRun || busy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !canRun}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Comparing…" : "Find gaps"}
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
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              <span
                className={`rounded px-1.5 py-0.5 ${BUCKET_COLOR.missing}`}
              >
                {view.missing_count} missing
              </span>{" "}
              · {view.weak_count} weak · {view.strong_count} strong · actual{" "}
              {formatUsd(view.cost_usd)}
            </span>
            <label className="ml-auto flex items-center gap-2">
              <span>Add to cluster:</span>
              <select
                value={clusterId}
                onChange={(e) => setClusterId(e.target.value)}
                className="rounded border px-2 py-1 text-xs"
              >
                <option value="">— None —</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <ExportMenu
              filenameStem={`content-gap-${view.yours}-vs-${view.competitor}`}
              rows={missing}
              columns={exportColumns}
            />
          </div>

          {missing.length > 0 ? (
            <div className="overflow-x-auto rounded border bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-1 text-left">Keyword</th>
                    <th className="px-2 py-1 text-right">Vol</th>
                    <th className="px-2 py-1 text-right">KD</th>
                    <th className="px-2 py-1 text-right">CPC</th>
                    <th className="px-2 py-1 text-right">Their #</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {missing.map((row) => {
                    const added = addedKeywords.has(row.keyword);
                    return (
                      <tr
                        key={row.keyword}
                        className="border-t hover:bg-slate-50"
                      >
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
                        <td className="px-2 py-1 text-right tabular-nums">
                          {row.rank_theirs ?? "—"}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => void addAsPost(row)}
                            disabled={added}
                            className="rounded border px-2 py-0.5 text-[11px] hover:bg-slate-100 disabled:opacity-50"
                          >
                            {added ? "✓ Added" : "+ Plan"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
              No gap keywords. You and {view.competitor} have non-overlapping
              footprints, or your domain already covers everything they rank
              for.
            </div>
          )}
        </>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter your domain and a competitor and click <strong>Find gaps</strong>{" "}
          to see keywords they rank for that you don't.
        </div>
      )}
    </div>
  );
}
