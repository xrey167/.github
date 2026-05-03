import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import ChatWithResultsButton from "../../components/ChatWithResultsButton";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import ResultsTable from "../../components/ResultsTable";
import { formatCount, formatUsd } from "../../lib/format";
import { tauriApi, type RankedBatch, type RankedKeyword } from "../../lib/tauri";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";

interface Props {
  target: string;
}

export default function RankedKeywordsTab({ target }: Props) {
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<RankedBatch | null>(null);

  const trimmed = target.trim();

  const columns = useMemo<ColumnDef<RankedKeyword, unknown>[]>(
    () => [
      {
        header: "Position",
        accessorKey: "rank_absolute",
        cell: (ctx) => ctx.getValue<number | null>() ?? "—",
      },
      {
        header: "Keyword",
        accessorKey: "keyword",
        cell: (ctx) => <span className="font-mono">{ctx.getValue<string>()}</span>,
      },
      {
        header: "Volume",
        accessorKey: "search_volume",
        cell: (ctx) => formatCount(ctx.getValue<number>() ?? 0),
      },
      {
        header: "ETV",
        accessorKey: "etv",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatCount(v) : "—";
        },
      },
      {
        header: "URL",
        accessorKey: "serp_url",
        cell: (ctx) => {
          const url = ctx.getValue<string | null>();
          if (!url) return "—";
          // The API can occasionally return non-absolute URLs (e.g., for
          // certain SERP feature types) that crash new URL(). Fall back
          // to the raw string so the row keeps rendering.
          let display: string;
          try {
            display = new URL(url).pathname || url;
          } catch {
            display = url;
          }
          return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {display}
            </a>
          );
        },
      },
    ],
    [],
  );

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.keywordsRanked({
        target: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: 200,
        useCache: true,
      });
      setBatch(result);
      toast.success(`${result.items.length} ranked keywords (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <CostPreview
          action={{ kind: "KeywordsForDomain", mode: "live" }}
          details={["Keywords for which the target ranks in Google, with SERP positions."]}
          disabled={!trimmed || busy}
        />
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !trimmed}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Run"}
        </button>
      </div>

      {batch && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {batch.items.length} ranked keywords · actual cost {formatUsd(batch.cost_usd)} (estimated {formatUsd(batch.estimated_usd)})
          </span>
          <div className="flex gap-2">
            <ChatWithResultsButton
              rows={batch.items}
              summary={`${batch.items.length} ranked keywords`}
            />
            <ExportMenu
              filenameStem="ranked-keywords"
              rows={batch.items}
              columns={columns}
            />
          </div>
        </div>
      )}

      <ResultsTable
        data={batch?.items ?? []}
        columns={columns}
        emptyMessage="Enter a target domain above and click Run."
      />
    </div>
  );
}
