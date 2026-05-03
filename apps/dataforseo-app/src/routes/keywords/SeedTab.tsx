import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../../components/CacheBadge";
import ChatWithResultsButton from "../../components/ChatWithResultsButton";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import QuickActions from "../../components/QuickActions";
import ResultsTable from "../../components/ResultsTable";
import type { CostAction } from "../../lib/cost";
import { formatCount, formatUsd } from "../../lib/format";
import { type LabsBatch, type LabsKeyword } from "../../lib/tauri";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";

interface Props {
  title: string;
  description: string;
  exportFilenameStem: string;
  /// Cost preview action. Pass a stable (memoized) value from the parent so
  /// the CostPreview doesn't re-render on every keystroke in the seed input.
  costAction: CostAction;
  /// Extra control rendered above the Run button (e.g. depth slider).
  extraControls?: React.ReactNode;
  /// `useCache=false` is passed when the user clicks Refresh to bypass the
  /// response cache for this call.
  run: (seed: string, useCache: boolean) => Promise<LabsBatch>;
}

export default function SeedTab({
  title,
  description,
  exportFilenameStem,
  costAction,
  extraControls,
  run,
}: Props) {
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<LabsBatch | null>(null);

  const trimmed = seed.trim();

  const columns = useMemo<ColumnDef<LabsKeyword, unknown>[]>(
    () => [
      { header: "Keyword", accessorKey: "keyword", cell: (ctx) => <span className="font-mono">{ctx.getValue<string>()}</span> },
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
      {
        header: "Difficulty",
        accessorKey: "keyword_difficulty",
        cell: (ctx) => ctx.getValue<number | null>() ?? "—",
      },
      {
        id: "actions",
        header: "",
        // Per-row Track / Audit / Brand quick-actions. Compact mode
        // renders icon-only buttons so the column stays narrow.
        cell: (ctx) => <QuickActions keyword={ctx.row.original.keyword} compact />,
      },
    ],
    [],
  );

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await run(trimmed, useCache);
      setBatch(result);
      const note = result.from_cache
        ? `${result.items.length} keywords (cached, $0.00)`
        : `${result.items.length} keywords (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2">
          <label htmlFor="seed" className="text-sm font-medium text-slate-700">
            Seed keyword
          </label>
          <input
            id="seed"
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo agentur"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-3">
          <CostPreview
            action={costAction}
            details={[`Location ${DEFAULT_LOCATION}, Language ${DEFAULT_LANGUAGE}`]}
            disabled={!trimmed || busy}
          />
          {extraControls}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !trimmed}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Running…" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || !trimmed}
              title="Bypass cache and refetch from DataForSEO"
              className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {batch && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <CacheBadge fromCache={batch.from_cache} fetchedAt={batch.fetched_at} />
            {batch.items.length} rows · actual {formatUsd(batch.cost_usd)} · estimated{" "}
            {formatUsd(batch.estimated_usd)}
          </span>
          <div className="flex gap-2">
            <ChatWithResultsButton
              rows={batch.items}
              summary={`${batch.items.length} ${title.toLowerCase()}`}
            />
            <ExportMenu
              filenameStem={exportFilenameStem}
              rows={batch.items}
              columns={columns}
            />
          </div>
        </div>
      )}

      <ResultsTable
        data={batch?.items ?? []}
        columns={columns}
        emptyMessage="Enter a seed keyword above and click Run."
      />
    </div>
  );
}
