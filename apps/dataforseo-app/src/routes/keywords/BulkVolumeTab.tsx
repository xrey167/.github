import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../../components/CacheBadge";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type BulkVolumeItem, type BulkVolumeView } from "../../lib/tauri";

const MAX_KEYWORDS = 1000;

/// Cheapest per-keyword volume in the catalogue: 0.0001 USD/kw via the
/// Labs Bulk Search Volume endpoint. ~750x cheaper than Google Ads at
/// bulk (1000 keywords for 0.10 USD vs 75 USD), trades some long-tail
/// accuracy. Cached for 30 days like the other Bulk endpoints.
export default function BulkVolumeTab() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BulkVolumeView | null>(null);

  const keywords = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const k = line.trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out.slice(0, MAX_KEYWORDS);
  }, [text]);

  async function onRun(useCache: boolean) {
    if (keywords.length === 0) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsBulkSearchVolume({
        keywords,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? `Loaded ${result.items.length} keywords (cached, $0.00)`
        : `Loaded ${result.items.length} keywords (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const sorted = useMemo(
    () =>
      view
        ? [...view.items].sort(
            (a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0),
          )
        : [],
    [view],
  );

  const exportColumns = useMemo<ColumnDef<BulkVolumeItem, unknown>[]>(
    () => [
      { id: "keyword", header: "Keyword", accessorKey: "keyword" },
      { id: "search_volume", header: "Volume", accessorKey: "search_volume" },
      { id: "competition", header: "Competition", accessorKey: "competition" },
      { id: "competition_level", header: "Level", accessorKey: "competition_level" },
      { id: "cpc", header: "CPC", accessorKey: "cpc" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Cheap bulk volume lookup via DataForSEO Labs — 0.0001 USD per keyword (≈ 0.10 USD for
        1000 kw, vs ~7.50 USD via Google Ads). Up to {MAX_KEYWORDS} keywords per request.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            Keywords ({keywords.length}/{MAX_KEYWORDS})
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            className="h-48 rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo tools&#10;keyword research&#10;backlink checker"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "LabsBulkSearchVolume", count: keywords.length }}
            details={[
              `${keywords.length} unique keywords`,
              "0.0001 USD per keyword",
              "Cached for 30 days",
            ]}
            disabled={busy || keywords.length === 0}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || keywords.length === 0}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Loading…" : "Lookup"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || keywords.length === 0}
              title="Bypass cache"
              className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {view && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CacheBadge fromCache={view.from_cache} fetchedAt={view.fetched_at} />
          <span>
            {view.items.length} rows · actual {formatUsd(view.cost_usd)} · estimated{" "}
            {formatUsd(view.estimated_usd)}
          </span>
          <span className="ml-auto">
            <ExportMenu filenameStem="bulk-volume" rows={sorted} columns={exportColumns} />
          </span>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-1 text-left">Keyword</th>
                <th className="px-2 py-1 text-right">Volume</th>
                <th className="px-2 py-1 text-right">Competition</th>
                <th className="px-2 py-1 text-left">Level</th>
                <th className="px-2 py-1 text-right">CPC</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i} className="border-t hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono">{row.keyword}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {row.search_volume?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {row.competition != null ? row.competition.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-1">{row.competition_level ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {row.cpc != null ? formatUsd(row.cpc) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !view &&
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Paste keywords above and click Lookup.
          </div>
        )
      )}
    </div>
  );
}
