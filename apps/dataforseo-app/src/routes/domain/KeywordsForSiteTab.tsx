import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import ResultsTable from "../../components/ResultsTable";
import { formatCount, formatUsd } from "../../lib/format";
import { tauriApi, type LabsBatch, type LabsKeyword } from "../../lib/tauri";

const DEFAULT_LOCATION = 2276;
const DEFAULT_LANGUAGE = "de";

interface Props {
  target: string;
}

export default function KeywordsForSiteTab({ target }: Props) {
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<LabsBatch | null>(null);

  const trimmed = target.trim();

  const columns = useMemo<ColumnDef<LabsKeyword, unknown>[]>(
    () => [
      { header: "Keyword", accessorKey: "keyword", cell: (ctx) => <span className="font-mono">{ctx.getValue<string>()}</span> },
      { header: "Volume", accessorKey: "search_volume", cell: (ctx) => formatCount(ctx.getValue<number>() ?? 0) },
      { header: "Competition", accessorKey: "competition" },
      {
        header: "CPC",
        accessorKey: "cpc",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatUsd(v) : "—";
        },
      },
      { header: "Difficulty", accessorKey: "keyword_difficulty", cell: (ctx) => ctx.getValue<number | null>() ?? "—" },
    ],
    [],
  );

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.keywordsForDomain({
        target: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: 200,
      });
      setBatch(result);
      toast.success(`${result.items.length} keywords (${formatUsd(result.cost_usd)})`);
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
          details={["Returns keywords related to the target site (Labs DB)."]}
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
        <div className="text-xs text-slate-500">
          {batch.items.length} rows · actual cost {formatUsd(batch.cost_usd)} (estimated {formatUsd(batch.estimated_usd)})
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
