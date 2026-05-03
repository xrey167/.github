import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCount, formatUsd } from "../../lib/format";
import {
  tauriApi,
  type AiCallRow,
  type AiUsageSummary,
} from "../../lib/tauri";
import Stat from "./Stat";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export default function AiTab() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [recent, setRecent] = useState<AiCallRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshSummary = useCallback(async () => {
    setBusy(true);
    try {
      setSummary(await tauriApi.getAiUsageSummary({ days }));
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }, [days]);

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await tauriApi.getAiRecentCalls({ limit: 50 }));
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
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
      summary?.by_model.map((m) => ({
        model: `${m.provider}/${m.model}`,
        cost: Number(m.cost_usd.toFixed(4)),
        calls: m.call_count,
      })) ?? [],
    [summary],
  );

  return (
    <div className="flex flex-col gap-6">
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
          label="Tokens in / out"
          value={
            summary
              ? `${formatCount(summary.total_input_tokens)} / ${formatCount(summary.total_output_tokens)}`
              : "—"
          }
          subline="combined for the range"
        />
        <Stat
          label="Models used"
          value={summary ? String(summary.by_model.length) : "—"}
          subline="distinct"
        />
      </div>

      <div className="rounded border bg-white p-3">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Spend by model</h3>
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No AI calls recorded in the selected range. Try /chat with a Quick Action attached.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" angle={-15} textAnchor="end" height={60} fontSize={11} />
              <YAxis tickFormatter={(v) => formatUsd(v)} fontSize={11} />
              <Tooltip
                formatter={(value: number, name) => [
                  name === "cost" ? formatUsd(value) : value,
                  name === "cost" ? "spend" : "calls",
                ]}
              />
              <Bar dataKey="cost" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded border bg-white">
        <h3 className="border-b px-3 py-2 text-sm font-medium text-slate-700">
          Recent AI calls (last 50)
        </h3>
        {recent == null || recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No AI calls yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2 text-right">In</th>
                <th className="px-3 py-2 text-right">Out</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr
                  key={`${r.ts}-${i}`}
                  className={`border-t ${r.error ? "bg-rose-50" : ""}`}
                  title={r.error ?? undefined}
                >
                  <td className="px-3 py-1.5 font-mono text-xs">{r.ts}</td>
                  <td className="px-3 py-1.5 text-xs">{r.provider}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{r.model}</td>
                  <td className="px-3 py-1.5 text-xs">{r.purpose}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                    {formatCount(r.input_tokens)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                    {formatCount(r.output_tokens)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatUsd(r.cost_usd)}</td>
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
