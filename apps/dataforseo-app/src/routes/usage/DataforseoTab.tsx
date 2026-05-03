import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ExportMenu from "../../components/ExportMenu";
import { formatUsd } from "../../lib/format";
import {
  tauriApi,
  type CallLogRow,
  type UsageSummary,
} from "../../lib/tauri";
import BudgetCard from "./BudgetCard";
import Stat from "./Stat";

const CALL_COLUMNS: ColumnDef<CallLogRow, unknown>[] = [
  { id: "ts", header: "Time", accessorKey: "ts" },
  { id: "endpoint", header: "Endpoint", accessorKey: "endpoint" },
  { id: "mode", header: "Mode", accessorKey: "mode" },
  { id: "cost_usd", header: "Cost USD", accessorKey: "cost_usd" },
  { id: "estimated_usd", header: "Estimated USD", accessorKey: "estimated_usd" },
  { id: "request_size", header: "Items", accessorKey: "request_size" },
  { id: "duration_ms", header: "Duration ms", accessorKey: "duration_ms" },
];

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export default function DataforseoTab() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [recent, setRecent] = useState<CallLogRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshSummary = useCallback(async () => {
    setBusy(true);
    try {
      setSummary(await tauriApi.getUsageSummary({ days }));
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }, [days]);

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await tauriApi.getRecentCalls({ limit: 50 }));
    } catch (e) {
      toast.error(formatError(e));
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshRecent()]);
  }, [refreshSummary, refreshRecent]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  const chartData = useMemo(
    () =>
      summary?.by_endpoint.map((e) => ({
        endpoint: e.endpoint,
        cost: Number(e.cost_usd.toFixed(4)),
        calls: e.call_count,
      })) ?? [],
    [summary],
  );

  const estimateAccuracy = useMemo(() => {
    if (!summary || summary.total_estimated_usd === 0) return null;
    const drift = summary.total_cost_usd - summary.total_estimated_usd;
    const pct = (drift / summary.total_estimated_usd) * 100;
    return { drift, pct };
  }, [summary]);

  return (
    <div className="flex flex-col gap-6">
      <BudgetCard />
      <div className="flex items-center justify-end gap-2">
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="rounded border px-2 py-1 text-sm"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Total spend"
          value={summary ? formatUsd(summary.total_cost_usd) : "—"}
          subline={`${summary?.total_calls ?? 0} calls`}
        />
        <Stat
          label="Estimated"
          value={summary ? formatUsd(summary.total_estimated_usd) : "—"}
          subline={
            estimateAccuracy
              ? `${estimateAccuracy.drift >= 0 ? "+" : ""}${formatUsd(estimateAccuracy.drift)} drift (${estimateAccuracy.pct.toFixed(1)}%)`
              : "—"
          }
        />
        <Stat
          label="Endpoints used"
          value={summary ? String(summary.by_endpoint.length) : "—"}
          subline="distinct"
        />
      </div>

      <div className="rounded border bg-white p-3">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Spend by endpoint</h3>
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No calls recorded in the selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="endpoint" angle={-15} textAnchor="end" height={60} fontSize={11} />
              <YAxis tickFormatter={(v) => formatUsd(v)} fontSize={11} />
              <Tooltip
                formatter={(value: number, name) => [
                  name === "cost" ? formatUsd(value) : value,
                  name === "cost" ? "spend" : "calls",
                ]}
              />
              <Bar dataKey="cost" fill="#475569" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="text-sm font-medium text-slate-700">Recent calls (last 50)</h3>
          {recent != null && recent.length > 0 && (
            <ExportMenu
              filenameStem="usage-dataforseo-calls"
              rows={recent}
              columns={CALL_COLUMNS}
            />
          )}
        </div>
        {recent == null || recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No calls yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Endpoint</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Est.</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={`${r.ts}-${i}`} className="border-t">
                  <td className="px-3 py-1.5 font-mono text-xs">{r.ts}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{r.endpoint}</td>
                  <td className="px-3 py-1.5 text-xs">{r.mode}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatUsd(r.cost_usd)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                    {r.estimated_usd != null ? formatUsd(r.estimated_usd) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                    {r.request_size ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                    {r.duration_ms ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
