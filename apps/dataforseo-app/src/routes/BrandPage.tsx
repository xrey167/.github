import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../components/CacheBadge";
import CostPreview from "../components/CostPreview";
import { formatError } from "../lib/errors";
import { formatUsd } from "../lib/format";
import {
  tauriApi,
  type BrandSearchView,
  type BrandSummaryView,
} from "../lib/tauri";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  neutral: "bg-slate-100 text-slate-700",
  negative: "bg-red-100 text-red-800",
};

interface BrandMention {
  url: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
  sentiment: string | null;
  date: string | null;
}

function pickMention(raw: Record<string, unknown>): BrandMention {
  const sentiments = raw.sentiment_connotations as
    | Record<string, number>
    | undefined;
  const top = sentiments
    ? Object.entries(sentiments).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    : ((raw.connotation as string | undefined) ?? null);
  return {
    url: (raw.url as string | undefined) ?? null,
    title: (raw.title as string | undefined) ?? null,
    description:
      ((raw.snippet as string | undefined) ??
        (raw.main_text as string | undefined)) ||
      null,
    domain: (raw.domain as string | undefined) ?? null,
    sentiment: top,
    date: (raw.date as string | undefined) ?? null,
  };
}

interface SummaryStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  top_keywords: string[];
  top_categories: string[];
}

function pickSummary(view: BrandSummaryView | null): SummaryStats | null {
  if (!view?.result) return null;
  const r = view.result as Record<string, unknown>;
  const sc = r.sentiments_count as Record<string, number> | undefined;
  const top_kw = (r.top_keywords as Array<Record<string, unknown>> | undefined) ?? [];
  const top_cat = (r.top_categories as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    total: (r.total_count as number) ?? 0,
    positive: sc?.positive ?? 0,
    neutral: sc?.neutral ?? 0,
    negative: sc?.negative ?? 0,
    top_keywords: top_kw
      .slice(0, 10)
      .map((k) => (k.keyword as string) ?? "")
      .filter(Boolean),
    top_categories: top_cat
      .slice(0, 10)
      .map((c) => (c.category as string) ?? "")
      .filter(Boolean),
  };
}

export default function BrandPage() {
  const [keyword, setKeyword] = useState("");
  const [positives, setPositives] = useState("");
  const [negatives, setNegatives] = useState("");
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState<BrandSearchView | null>(null);
  const [summary, setSummary] = useState<BrandSummaryView | null>(null);

  const trimmed = keyword.trim();
  const positiveList = useMemo(
    () =>
      positives
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [positives],
  );
  const negativeList = useMemo(
    () =>
      negatives
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [negatives],
  );
  const stats = useMemo(() => pickSummary(summary), [summary]);
  const mentions = useMemo<BrandMention[]>(() => {
    if (!search) return [];
    const raw = search.items as Array<Record<string, unknown>>;
    return raw.map(pickMention);
  }, [search]);

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      // Run summary + search in parallel — they're independent and the
      // user wants both panels populated together.
      const [s, q] = await Promise.all([
        tauriApi.brandSummary({
          keyword: trimmed,
          positiveKeywords: positiveList,
          negativeKeywords: negativeList,
          useCache,
        }),
        tauriApi.brandSearch({
          keyword: trimmed,
          limit,
          positiveKeywords: positiveList,
          negativeKeywords: negativeList,
          useCache,
        }),
      ]);
      setSummary(s);
      setSearch(q);
      const totalCost = s.cost_usd + q.cost_usd;
      const note =
        s.from_cache && q.from_cache
          ? `Cached brand snapshot ($0.00)`
          : `Loaded ${q.items_count} mentions (${formatUsd(totalCost)})`;
      toast.success(note);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Brand Monitoring</h2>
        <p className="text-sm text-slate-600">
          Tracks brand mentions across the open-web index — news, blogs, e-commerce, message
          boards. Combines a Summary call (0.001 USD flat) with a Search call (0.001 USD/row) so
          you see aggregate stats and individual mentions in one shot.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Brand keyword</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="my brand"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Must contain (one per line)</span>
          <textarea
            value={positives}
            onChange={(e) => setPositives(e.target.value)}
            disabled={busy}
            className="h-20 rounded border px-2 py-1 font-mono text-xs disabled:bg-slate-50"
            placeholder={"review\nrecommendation"}
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Must NOT contain</span>
          <textarea
            value={negatives}
            onChange={(e) => setNegatives(e.target.value)}
            disabled={busy}
            className="h-20 rounded border px-2 py-1 font-mono text-xs disabled:bg-slate-50"
            placeholder={"job\nhiring"}
            spellCheck={false}
          />
        </label>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">Mention limit ({limit})</span>
            <input
              type="number"
              min={10}
              max={1000}
              step={10}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10) || 50)}
              disabled={busy}
              className="rounded border px-2 py-1"
            />
          </label>
          <CostPreview
            action={{ kind: "ContentAnalysisSearch", rows: limit }}
            details={[
              `Summary 0.001 + Search ${limit} × 0.001 USD`,
              "Cached for 3 days",
            ]}
            disabled={busy || !trimmed}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !trimmed}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Loading…" : "Track brand"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || !trimmed}
              title="Bypass cache"
              className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {summary && search && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CacheBadge
            fromCache={summary.from_cache && search.from_cache}
            fetchedAt={summary.fetched_at ?? search.fetched_at}
          />
          <span>
            actual {formatUsd((summary.cost_usd ?? 0) + (search.cost_usd ?? 0))} · estimated{" "}
            {formatUsd((summary.estimated_usd ?? 0) + (search.estimated_usd ?? 0))}
          </span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Total mentions" value={stats.total.toLocaleString()} />
          <Tile
            label="Positive"
            value={stats.positive.toLocaleString()}
            tone="emerald"
          />
          <Tile label="Neutral" value={stats.neutral.toLocaleString()} />
          <Tile
            label="Negative"
            value={stats.negative.toLocaleString()}
            tone="red"
          />
        </div>
      )}

      {stats && (stats.top_keywords.length > 0 || stats.top_categories.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {stats.top_keywords.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Top keywords in mentions</h3>
              <ul className="flex flex-wrap gap-1">
                {stats.top_keywords.map((k, i) => (
                  <li
                    key={i}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono"
                  >
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stats.top_categories.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Top categories</h3>
              <ul className="flex flex-wrap gap-1">
                {stats.top_categories.map((c, i) => (
                  <li
                    key={i}
                    className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mentions.length > 0 && (
        <div className="rounded border bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold">
            Mentions ({mentions.length} of {search?.total_count.toLocaleString()})
          </h3>
          <ol className="space-y-2">
            {mentions.map((m, i) => (
              <li key={i} className="rounded border bg-slate-50 p-2">
                <div className="flex flex-wrap items-baseline gap-2 text-xs text-slate-500">
                  {m.sentiment && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] ${
                        SENTIMENT_COLORS[m.sentiment] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {m.sentiment}
                    </span>
                  )}
                  {m.domain && <span className="font-mono">{m.domain}</span>}
                  {m.date && <span>{m.date.slice(0, 10)}</span>}
                </div>
                {m.url ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm text-blue-600 hover:underline"
                  >
                    {m.title ?? m.url}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-medium">{m.title ?? "—"}</p>
                )}
                {m.description && (
                  <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!summary && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a brand keyword and click Track brand.
        </div>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
        ? "text-red-700"
        : "text-slate-800";
  return (
    <div className="rounded border bg-white p-3">
      <div className={`text-xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
