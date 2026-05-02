import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { tauriApi, type RankPoint, type TrackedKeywordWithRank } from "../../lib/tauri";

interface Props {
  row: TrackedKeywordWithRank;
  onRemove: (id: number) => void;
  onRunNow: (id: number) => void;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const parsed = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const ms = Date.now() - parsed.getTime();
  if (!Number.isFinite(ms) || ms < 0) return iso.slice(0, 16);
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function TrackingRow({ row, onRemove, onRunNow }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<RankPoint[] | null>(null);
  const k = row.keyword;
  const change =
    row.current_rank != null && row.previous_rank != null
      ? row.previous_rank - row.current_rank
      : null;

  useEffect(() => {
    if (expanded && history === null) {
      tauriApi
        .trackingHistory({ id: k.id, days: 30 })
        .then(setHistory)
        .catch(() => setHistory([]));
    }
  }, [expanded, history, k.id]);

  return (
    <>
      <tr
        className="cursor-pointer border-t hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2 font-mono">{k.target}</td>
        <td className="px-3 py-2 font-mono">{k.keyword}</td>
        <td className="px-3 py-2 text-right tabular-nums">
          {row.current_rank != null ? (
            <span className="font-medium">{row.current_rank}</span>
          ) : (
            <span className="text-slate-400">100+</span>
          )}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {change == null ? (
            <span className="text-slate-400">—</span>
          ) : change > 0 ? (
            <span className="text-emerald-700">▲ {change}</span>
          ) : change < 0 ? (
            <span className="text-red-700">▼ {Math.abs(change)}</span>
          ) : (
            <span className="text-slate-500">·</span>
          )}
        </td>
        <td className="px-3 py-2 capitalize">{k.frequency}</td>
        <td className="px-3 py-2 text-slate-500">{formatRelative(k.last_run_at)}</td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRunNow(k.id);
            }}
            className="mr-1 rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
            title="Run a check now"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(k.id);
            }}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
            title="Stop tracking"
          >
            ✕
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="border-t bg-slate-50 px-3 py-3">
            <Trend points={history} url={row.current_url ?? null} />
          </td>
        </tr>
      )}
    </>
  );
}

function Trend({ points, url }: { points: RankPoint[] | null; url: string | null }) {
  if (points === null) {
    return <p className="text-xs text-slate-500">Loading history…</p>;
  }
  if (points.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No history yet — first check will run within an hour, or click ↻ to run now.
      </p>
    );
  }
  // Recharts handles nulls by breaking the line; we want gaps when the
  // page wasn't ranking at all. So we keep `null` values intact.
  const data = points.map((p) => ({
    date: p.fetched_at.slice(0, 10),
    rank: p.rank_absolute,
  }));
  return (
    <div className="flex flex-col gap-2">
      {url && (
        <p className="truncate text-xs text-slate-500">
          Latest URL:{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-blue-600 hover:underline"
          >
            {url}
          </a>
        </p>
      )}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              // Lower rank = better, so reverse the axis (1 at top).
              reversed
              domain={[1, 100]}
              tick={{ fontSize: 11 }}
              allowDataOverflow
            />
            <Tooltip
              // Recharts types `value` as ValueType (number|string|array). At
              // runtime null comes through as undefined here, so fall back
              // to "100+" for the unranked-day case.
              formatter={((value: unknown) => [
                value == null ? "100+" : String(value),
                "Position",
              ]) as never}
            />
            <Line
              type="monotone"
              dataKey="rank"
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
