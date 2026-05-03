import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import BulkKeywordInput, { parseKeywords } from "../../components/BulkKeywordInput";
import ChatWithResultsButton from "../../components/ChatWithResultsButton";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import ResultsTable from "../../components/ResultsTable";
import { formatCount, formatUsd } from "../../lib/format";
import { tauriApi, type KeywordVolume, type KeywordVolumeBatch } from "../../lib/tauri";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";

export default function VolumeTab() {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<KeywordVolumeBatch | null>(null);
  const [useCache, setUseCache] = useState(true);

  const keywords = useMemo(() => parseKeywords(raw), [raw]);

  const columns = useMemo<ColumnDef<KeywordVolume, unknown>[]>(
    () => [
      {
        header: "Keyword",
        accessorKey: "keyword",
        cell: (ctx) => (
          <span className="font-mono">
            {ctx.getValue<string>()}
            {ctx.row.original.from_cache && (
              <span className="ml-2 rounded bg-slate-200 px-1 text-xs">cache</span>
            )}
          </span>
        ),
      },
      {
        header: "Volume",
        accessorKey: "search_volume",
        cell: (ctx) => formatCount(ctx.getValue<number>() ?? 0),
      },
      { header: "Competition", accessorKey: "competition" },
      {
        header: "CPC",
        accessorKey: "cpc",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatUsd(v) : "—";
        },
      },
    ],
    [],
  );

  async function onRun() {
    if (keywords.length === 0 || keywords.length > 1000) return;
    setBusy(true);
    try {
      const result = await tauriApi.keywordsSearchVolume({
        keywords,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache,
      });
      setBatch(result);
      toast.success(
        `${result.fresh} fetched, ${result.cache_hits} from cache (${formatUsd(result.cost_usd)})`,
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <BulkKeywordInput value={raw} onChange={setRaw} disabled={busy} />
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{
              kind: "KeywordsSearchVolume",
              count: keywords.length,
              mode: "live",
            }}
            details={[
              `${keywords.length} unique keywords`,
              `Location ${DEFAULT_LOCATION}, Language ${DEFAULT_LANGUAGE}`,
              useCache ? "Cache reused where possible" : "Cache disabled",
            ]}
            disabled={keywords.length === 0 || busy}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              disabled={busy}
            />
            Use 30-day cache
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || keywords.length === 0 || keywords.length > 1000}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {batch && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {batch.items.length} rows · {batch.cache_hits} from cache · {batch.fresh} freshly fetched ·
            actual cost {formatUsd(batch.cost_usd)} (estimated {formatUsd(batch.estimated_usd)})
          </span>
          <div className="flex gap-2">
            <ChatWithResultsButton
              rows={batch.items}
              summary={`${batch.items.length} keywords from /keywords/volume`}
            />
            <ExportMenu
              filenameStem="keyword-volume"
              rows={batch.items}
              columns={columns}
            />
          </div>
        </div>
      )}

      <ResultsTable
        data={batch?.items ?? []}
        columns={columns}
        emptyMessage="Enter keywords above and click Run."
      />
    </div>
  );
}
