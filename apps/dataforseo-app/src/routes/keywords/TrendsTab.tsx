import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CacheBadge from "../../components/CacheBadge";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type TrendsView } from "../../lib/tauri";

const SERIES_COLORS = ["#0f172a", "#0891b2", "#65a30d", "#d97706", "#dc2626"];

interface ChartPoint {
  date: string;
  [key: string]: string | number | null;
}

function pickGraph(view: TrendsView): ChartPoint[] | null {
  const items = view.items as Array<Record<string, unknown>>;
  const graph = items.find((i) => i.type === "google_trends_graph");
  if (!graph) return null;
  const data = graph.data as
    | Array<{ date_from?: string; date_to?: string; values?: Array<number | null> }>
    | undefined;
  if (!data || data.length === 0) return null;
  const keywords = view.keywords;
  return data.map((d) => {
    const point: ChartPoint = { date: (d.date_from ?? d.date_to ?? "").slice(0, 10) };
    keywords.forEach((kw, idx) => {
      const v = d.values?.[idx];
      point[kw] = v == null ? null : v;
    });
    return point;
  });
}

function pickList(
  view: TrendsView,
  type: "google_trends_topics_list" | "google_trends_queries_list",
): string[] {
  const items = view.items as Array<Record<string, unknown>>;
  const block = items.find((i) => i.type === type);
  if (!block) return [];
  const data = block.data as Array<{ title?: string; query?: string }> | undefined;
  if (!data) return [];
  return data
    .map((d) => d.title ?? d.query)
    .filter((s): s is string => typeof s === "string")
    .slice(0, 10);
}

export default function TrendsTab() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<TrendsView | null>(null);

  const keywords = useMemo(
    () =>
      text
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 5),
    [text],
  );

  async function onRun(useCache: boolean) {
    if (keywords.length === 0) return;
    setBusy(true);
    try {
      const result = await tauriApi.googleTrendsExplore({
        keywords,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        dateFrom: null,
        dateTo: null,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? `Cached trends ($0.00)`
        : `Loaded (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const chartData = useMemo(() => (view ? pickGraph(view) : null), [view]);
  const topics = useMemo(
    () => (view ? pickList(view, "google_trends_topics_list") : []),
    [view],
  );
  const queries = useMemo(
    () => (view ? pickList(view, "google_trends_queries_list") : []),
    [view],
  );

  // ExportMenu columns are derived from the actual keywords queried, plus
  // the leading date column. CSV export is the most useful artifact since
  // it's a time series — pastes straight into a spreadsheet.
  //
  // accessorFn (not accessorKey) so a keyword like "example.com" doesn't
  // get treated as a nested path by TanStack Table.
  const exportColumns = useMemo<ColumnDef<ChartPoint, unknown>[]>(
    () => [
      { id: "date", header: "Date", accessorKey: "date" },
      ...(view?.keywords.map((kw) => ({
        id: kw,
        header: kw,
        accessorFn: (row: ChartPoint) => row[kw],
      })) ?? []),
    ],
    [view?.keywords],
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Google Trends interest-over-time for up to 5 keywords. 0.05 USD per call regardless of
        keyword count or date range; cached for 7 days.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            Keywords ({keywords.length}/5, comma or newline separated)
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            className="h-24 rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder={"seo tools, ahrefs, semrush"}
            spellCheck={false}
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "KeywordsTrends" }}
            details={["0.05 USD per call", "Cached for 7 days"]}
            disabled={busy || keywords.length === 0}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || keywords.length === 0}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Loading…" : "Compare trends"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || keywords.length === 0}
              title="Bypass cache"
              className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {view && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CacheBadge fromCache={view.from_cache} fetchedAt={view.fetched_at} />
          <span>
            actual {formatUsd(view.cost_usd)} · estimated {formatUsd(view.estimated_usd)}
          </span>
          {chartData && chartData.length > 0 && (
            <span className="ml-auto">
              <ExportMenu
                filenameStem={`trends-${view.keywords.join("-")}`}
                rows={chartData}
                columns={exportColumns}
              />
            </span>
          )}
        </div>
      )}

      {chartData && chartData.length > 0 ? (
        <div className="rounded border bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold">Interest over time</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {view!.keywords.map((kw, i) => (
                  <Line
                    key={kw}
                    type="monotone"
                    dataKey={kw}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : view ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          Trends API returned no graph data for this query.
        </div>
      ) : null}

      {(topics.length > 0 || queries.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {topics.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Rising topics</h3>
              <ul className="space-y-1 text-xs">
                {topics.map((t, i) => (
                  <li key={i} className="rounded bg-slate-50 px-2 py-1">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {queries.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Rising queries</h3>
              <ul className="space-y-1 text-xs">
                {queries.map((q, i) => (
                  <li key={i} className="rounded bg-slate-50 px-2 py-1 font-mono">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter up to 5 keywords and click Compare trends.
        </div>
      )}
    </div>
  );
}
