import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type CompetitorDomain, type CompetitorsDomainView } from "../../lib/tauri";

interface Props {
  target: string;
}

export default function CompetitorsDomainTab({ target }: Props) {
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<CompetitorsDomainView | null>(null);

  const trimmed = target.trim();

  const exportColumns = useMemo<ColumnDef<CompetitorDomain, unknown>[]>(
    () => [
      { id: "domain", header: "Competitor", accessorKey: "domain" },
      { id: "intersections", header: "Shared Keywords", accessorKey: "intersections" },
      { id: "avg_position", header: "Avg Position", accessorKey: "avg_position" },
      { id: "sum_position", header: "Sum Position", accessorKey: "sum_position" },
    ],
    [],
  );

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsCompetitorsDomain({
        target: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: 100,
        useCache: true,
      });
      setView(result);
      toast.success(`${result.items.length} competitors (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Domains that compete with the target in organic search — ranked by keyword overlap. Shows
        average position, total shared keywords, and sum of SERP positions. 0.0125 USD.
      </p>

      <div className="flex items-end gap-3">
        <CostPreview
          action={{ kind: "LabsCompetitorsDomain" }}
          details={["0.0125 USD per request", `Target: ${trimmed || "—"}`]}
          disabled={!trimmed || busy}
        />
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !trimmed}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Loading…" : "Find Competitors"}
        </button>
      </div>

      {!trimmed && (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          Enter a target domain above.
        </div>
      )}

      {view && view.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {view.items.length} competitors for {view.target} · {formatUsd(view.cost_usd)}
            </span>
            <ExportMenu
              filenameStem={`competitors-${view.target}`}
              rows={view.items}
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left">Competitor</th>
                  <th className="px-2 py-1 text-right">Shared Keywords</th>
                  <th className="px-2 py-1 text-right">Avg Position</th>
                  <th className="px-2 py-1 text-right">Sum Position</th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-1 font-mono">{row.domain ?? "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.intersections?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.avg_position != null ? row.avg_position.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.sum_position?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : view ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          No competitors found.
        </div>
      ) : null}
    </div>
  );
}
