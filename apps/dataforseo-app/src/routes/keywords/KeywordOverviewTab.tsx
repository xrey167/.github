import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../../components/CacheBadge";
import CostPreview from "../../components/CostPreview";
import QuickActions from "../../components/QuickActions";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type KeywordOverviewView } from "../../lib/tauri";

interface Pulled {
  search_volume: number | null;
  competition: string | null;
  competition_index: number | null;
  cpc: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
  serp_features: string[];
}

function pick(view: KeywordOverviewView): Pulled {
  const item = view.item ?? {};
  const keyword_info = (item as Record<string, unknown>).keyword_info as
    | Record<string, unknown>
    | undefined;
  const keyword_props = (item as Record<string, unknown>).keyword_properties as
    | Record<string, unknown>
    | undefined;
  const intent_info = (item as Record<string, unknown>).search_intent_info as
    | Record<string, unknown>
    | undefined;
  const serp_info = (item as Record<string, unknown>).serp_info as
    | Record<string, unknown>
    | undefined;
  const serp_item_types =
    (serp_info?.serp_item_types as Array<unknown> | undefined)?.filter(
      (s): s is string => typeof s === "string",
    ) ?? [];
  return {
    search_volume: (keyword_info?.search_volume as number | null) ?? null,
    competition: (keyword_info?.competition_level as string | null) ?? null,
    competition_index: (keyword_info?.competition as number | null) ?? null,
    cpc: (keyword_info?.cpc as number | null) ?? null,
    keyword_difficulty:
      (keyword_props?.keyword_difficulty as number | null) ?? null,
    search_intent: (intent_info?.main_intent as string | null) ?? null,
    serp_features: serp_item_types,
  };
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-sky-100 text-sky-800",
  commercial: "bg-amber-100 text-amber-800",
  navigational: "bg-violet-100 text-violet-800",
  transactional: "bg-emerald-100 text-emerald-800",
};

export default function KeywordOverviewTab() {
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<KeywordOverviewView | null>(null);
  const trimmed = keyword.trim();
  const data = useMemo(() => (view ? pick(view) : null), [view]);

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsKeywordOverview({
        keyword: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? `Cached overview ($0.00)`
        : `Loaded (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Comprehensive single-call keyword lookup — volume, KD, CPC, search intent, and SERP
        feature signals all at once. Replaces 4-5 separate Labs calls. 0.0125 USD per lookup,
        cached for 7 days.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Keyword</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo tools"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "LabsKeywordOverview" }}
            details={["0.0125 USD per lookup", "Cached for 7 days"]}
            disabled={busy || !trimmed}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !trimmed}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Loading…" : "Lookup"}
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

      {view && data && (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CacheBadge fromCache={view.from_cache} fetchedAt={view.fetched_at} />
            <span>
              actual {formatUsd(view.cost_usd)} · estimated {formatUsd(view.estimated_usd)}
            </span>
            <span className="ml-auto">
              <QuickActions keyword={view.keyword} />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              label="Search volume"
              value={data.search_volume?.toLocaleString() ?? "—"}
            />
            <Tile
              label="Difficulty"
              value={data.keyword_difficulty != null ? String(data.keyword_difficulty) : "—"}
              detail="0–100 KD"
            />
            <Tile
              label="CPC"
              value={data.cpc != null ? formatUsd(data.cpc) : "—"}
            />
            <Tile
              label="Competition"
              value={data.competition ?? "—"}
              detail={
                data.competition_index != null
                  ? `index ${data.competition_index}`
                  : undefined
              }
            />
          </div>

          {data.search_intent && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Search intent</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  INTENT_COLORS[data.search_intent] ?? "bg-slate-100 text-slate-700"
                }`}
              >
                {data.search_intent}
              </span>
            </div>
          )}

          {data.serp_features.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">SERP features present</h3>
              <div className="flex flex-wrap gap-1">
                {data.serp_features.map((f) => (
                  <span
                    key={f}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a keyword and click Lookup.
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
      {detail && <div className="text-[11px] text-slate-400">{detail}</div>}
    </div>
  );
}
