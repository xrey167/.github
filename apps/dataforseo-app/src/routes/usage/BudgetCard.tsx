import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import { formatUsd } from "../../lib/format";
import { tauriApi, type BudgetStatus } from "../../lib/tauri";

type Period = "daily" | "monthly";

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
];

/// Spend tracker + advisory budget. Polls every 30s so the spent_usd
/// figure stays roughly current without live-updating on every API call.
/// Setting limit_usd=0 (or clicking Clear) removes the budget.
export default function BudgetCard() {
  const [period, setPeriod] = useState<Period>("daily");
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [limitInput, setLimitInput] = useState<string>("5");
  const [alertInput, setAlertInput] = useState<string>("80");

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const s = await tauriApi.getBudgetStatus({ period });
        if (!cancel) {
          setStatus(s);
          if (s.limit_usd != null) setLimitInput(String(s.limit_usd));
          if (s.alert_at_pct != null) setAlertInput(String(s.alert_at_pct));
        }
      } catch {
        // non-fatal: card just stays empty
      }
    }
    load();
    const t = window.setInterval(load, 30_000);
    return () => {
      cancel = true;
      window.clearInterval(t);
    };
  }, [period]);

  async function onSave() {
    const limit = parseFloat(limitInput);
    const alertPct = parseFloat(alertInput);
    if (!Number.isFinite(limit) || limit <= 0) {
      toast.error("Limit must be a positive number");
      return;
    }
    if (!Number.isFinite(alertPct) || alertPct <= 0 || alertPct > 100) {
      toast.error("Alert threshold must be between 1 and 100");
      return;
    }
    try {
      await tauriApi.setBudget({
        budget: { period, limit_usd: limit, alert_at_pct: alertPct },
      });
      toast.success(`${period} budget set to ${formatUsd(limit)}`);
      const s = await tauriApi.getBudgetStatus({ period });
      setStatus(s);
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  async function onClear() {
    try {
      await tauriApi.clearBudget({ period });
      toast.success("Budget cleared");
      const s = await tauriApi.getBudgetStatus({ period });
      setStatus(s);
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  const stateColor =
    status?.state === "exceeded"
      ? "bg-red-100 text-red-800 border-red-200"
      : status?.state === "alert"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : status?.state === "ok"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-slate-50 text-slate-600 border-slate-200";

  const pct = status?.used_pct ?? 0;
  const barWidth = Math.min(100, Math.max(0, pct));

  return (
    <div className="rounded border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Budget</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded px-2 py-1 text-xs ${
                period === p.id ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {status && (
        <div className={`mb-3 rounded border px-3 py-2 text-sm ${stateColor}`}>
          {status.limit_usd != null ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span>
                  {formatUsd(status.spent_usd)} / {formatUsd(status.limit_usd)} ·{" "}
                  {pct.toFixed(0)}%
                </span>
                <span className="text-xs uppercase">{status.state}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-white/60">
                <div
                  className="h-full bg-current opacity-70"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          ) : (
            <span>No {period} budget set · spent so far {formatUsd(status.spent_usd)}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">Limit (USD)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            className="w-28 rounded border px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">Alert at (%)</span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={alertInput}
            onChange={(e) => setAlertInput(e.target.value)}
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={onSave}
          className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white"
        >
          Save
        </button>
        {status?.limit_usd != null && (
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
