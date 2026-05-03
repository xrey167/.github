import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChatWithResultsButton from "../components/ChatWithResultsButton";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { formatCount, formatUsd } from "../lib/format";
import { tauriApi, type RankedKeyword } from "../lib/tauri";

const KEYWORD_LIMIT = 200;

interface TrafficSummary {
  total_etv: number;
  total_volume: number;
  ranked_keywords: number;
  top_keywords: RankedKeyword[];
}

export default function TrafficPage() {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [costUsd, setCostUsd] = useState<number | null>(null);

  const trimmed = target.trim();

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const batch = await tauriApi.keywordsRanked({
        target: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: KEYWORD_LIMIT,
        useCache: true,
      });
      const totalEtv = batch.items.reduce((sum, it) => sum + (it.etv ?? 0), 0);
      const totalVolume = batch.items.reduce(
        (sum, it) => sum + (it.search_volume ?? 0),
        0,
      );
      const topKeywords = [...batch.items]
        .sort((a, b) => (b.etv ?? 0) - (a.etv ?? 0))
        .slice(0, 10);
      setSummary({
        total_etv: totalEtv,
        total_volume: totalVolume,
        ranked_keywords: batch.items.length,
        top_keywords: topKeywords,
      });
      setCostUsd(batch.cost_usd);
      toast.success(
        `${batch.items.length} keywords (${formatUsd(batch.cost_usd)})`,
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const chartData = useMemo(
    () =>
      summary?.top_keywords.map((kw) => ({
        keyword: kw.keyword,
        etv: Number((kw.etv ?? 0).toFixed(2)),
      })) ?? [],
    [summary],
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Traffic Estimate</h2>
        <p className="text-sm text-slate-600">
          Organic-traffic estimate for any domain, summed from the ETV (estimated
          traffic value) of the top {KEYWORD_LIMIT} keywords it ranks for.
          Direct, social, and referral traffic are not included — for that
          you'd need a clickstream provider. SEMrush Traffic Analytics is
          80%-replicable from this view alone.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Domain</span>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="example.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !trimmed}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Estimating…" : "Estimate"}
        </button>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Tile
              label="Estimated organic visits / month"
              value={formatCount(Math.round(summary.total_etv))}
              subline="Σ ETV across top ranked keywords"
            />
            <Tile
              label="Total search volume"
              value={formatCount(summary.total_volume)}
              subline={`across ${summary.ranked_keywords} keywords`}
            />
            <Tile
              label="API spend"
              value={costUsd != null ? formatUsd(costUsd) : "—"}
              subline="single keywords_ranked call"
            />
          </div>

          <div className="rounded border bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">
                Top traffic-driving keywords
              </h3>
              <ChatWithResultsButton
                rows={summary.top_keywords}
                summary={`Top ${summary.top_keywords.length} traffic keywords for ${trimmed}`}
              />
            </div>
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No ranked keywords with ETV data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 16, bottom: 60, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="keyword"
                    angle={-25}
                    textAnchor="end"
                    height={80}
                    fontSize={11}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCount(v)}
                    fontSize={11}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCount(Math.round(v)), "ETV"]}
                  />
                  <Bar dataKey="etv" fill="#475569" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded border bg-amber-50 p-3 text-xs text-amber-900">
            <strong>What this is, what this isn't:</strong> ETV is DataForSEO's
            modeled organic-traffic estimate per keyword (volume × CTR for the
            domain's actual rank). Sum across all ranked keywords gives a
            credible organic visits/month figure. It does <em>not</em> include
            direct, referral, social, or paid traffic — for a holistic
            "monthly visits" number you'd need a clickstream provider
            (SimilarWeb, etc).
          </div>
        </>
      )}

      {!summary && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a domain above and click Estimate.
        </div>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  subline,
}: {
  label: string;
  value: string;
  subline?: string;
}) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {subline && <div className="mt-1 text-xs text-slate-500">{subline}</div>}
    </div>
  );
}
