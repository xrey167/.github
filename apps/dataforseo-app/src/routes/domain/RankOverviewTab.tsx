import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import CostPreview from "../../components/CostPreview";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatCount, formatUsd } from "../../lib/format";
import {
  tauriApi,
  type DomainRankOverviewView,
} from "../../lib/tauri";

interface Props {
  target: string;
}

export default function RankOverviewTab({ target }: Props) {
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<DomainRankOverviewView | null>(null);

  const trimmed = target.trim();

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsDomainRankOverview({
        target: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache: true,
      });
      setView(result);
      toast.success(`Loaded overview for ${trimmed} (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  // DataForSEO returns one item with `metrics.organic` and `metrics.paid`
  // sub-objects keyed by the well-known position-bucket fields.
  const metrics = useMemo(() => {
    const first = view?.items?.[0];
    const m = (first as Record<string, unknown> | undefined)?.["metrics"];
    if (!m || typeof m !== "object") return { organic: null, paid: null };
    const map = m as Record<string, unknown>;
    return {
      organic: pickMetrics(map["organic"]),
      paid: pickMetrics(map["paid"]),
    };
  }, [view]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <p className="text-sm text-slate-600">
          SEMrush-style "Domain Overview": position-bucket counts and traffic
          estimates for a domain. One Labs request, flat 0.0125 USD.
        </p>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "LabsDomainRankOverview" }}
            details={["Single Labs request", "Flat fee, no per-row component"]}
            disabled={busy || !trimmed}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !trimmed}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Load overview"}
          </button>
        </div>
      </div>

      {view && metrics.organic == null && metrics.paid == null && (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          No overview metrics returned for {view.target} (no Google traffic
          detected by DataForSEO Labs).
        </div>
      )}

      {view && (metrics.organic || metrics.paid) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <strong className="font-mono text-slate-700">{view.target}</strong>
            <span className="ml-auto">
              actual {formatUsd(view.cost_usd)} · estimated{" "}
              {formatUsd(view.estimated_usd)}
            </span>
          </div>

          {metrics.organic && (
            <MetricsCard label="Organic" metrics={metrics.organic} />
          )}
          {metrics.paid && <MetricsCard label="Paid" metrics={metrics.paid} />}

          <details className="rounded border bg-slate-50 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-slate-700">
              Raw response (debug)
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto text-[11px]">
              {JSON.stringify(view.items, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a domain above and click Load overview.
        </div>
      )}
    </div>
  );
}

interface PickedMetrics {
  count: number | null;
  etv: number | null;
  pos_1: number | null;
  pos_2_3: number | null;
  pos_4_10: number | null;
  pos_11_20: number | null;
  pos_21_30: number | null;
  pos_31_100: number | null;
}

function pickMetrics(raw: unknown): PickedMetrics | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const get = (k: string): number | null => {
    const v = m[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const out: PickedMetrics = {
    count: get("count"),
    etv: get("etv"),
    pos_1: get("pos_1"),
    pos_2_3: get("pos_2_3"),
    pos_4_10: get("pos_4_10"),
    pos_11_20: get("pos_11_20"),
    pos_21_30: get("pos_21_30"),
    pos_31_100: get("pos_31_100"),
  };
  // If every field is null, treat as "no data" so the caller can render
  // an empty-state card instead of a row of em dashes.
  const anySet = Object.values(out).some((v) => v != null);
  return anySet ? out : null;
}

function MetricsCard({
  label,
  metrics,
}: {
  label: string;
  metrics: PickedMetrics;
}) {
  const tiles: Array<{ label: string; value: number | null }> = [
    { label: "Keywords", value: metrics.count },
    { label: "Est. monthly traffic", value: metrics.etv },
    { label: "Pos 1", value: metrics.pos_1 },
    { label: "Pos 2–3", value: metrics.pos_2_3 },
    { label: "Pos 4–10", value: metrics.pos_4_10 },
    { label: "Pos 11–20", value: metrics.pos_11_20 },
    { label: "Pos 21–30", value: metrics.pos_21_30 },
    { label: "Pos 31–100", value: metrics.pos_31_100 },
  ];
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded border bg-white p-3">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {t.value != null ? formatCount(t.value) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
