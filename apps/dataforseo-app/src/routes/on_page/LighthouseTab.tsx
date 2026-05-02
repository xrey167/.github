import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../../components/CacheBadge";
import CostPreview from "../../components/CostPreview";
import { formatUsd } from "../../lib/format";
import { tauriApi, type LighthouseView } from "../../lib/tauri";

interface Props {
  url: string;
}

interface CategoryScore {
  id: string;
  title: string;
  score: number | null;
}

const CATEGORY_ORDER = ["performance", "accessibility", "best-practices", "seo", "pwa"] as const;

function pickCategories(view: LighthouseView): CategoryScore[] {
  const cats = view.result?.categories as Record<string, Record<string, unknown>> | undefined;
  if (!cats) return [];
  return CATEGORY_ORDER.flatMap((id) => {
    const c = cats[id];
    if (!c) return [];
    const score = (c.score as number | null | undefined) ?? null;
    const title = (c.title as string | undefined) ?? id;
    return [{ id, title, score }];
  });
}

function pickKeyMetrics(view: LighthouseView): Array<{ key: string; value: string }> {
  const audits = view.result?.audits as Record<string, Record<string, unknown>> | undefined;
  if (!audits) return [];
  // Lighthouse's six "core" perf audits — what users actually look at.
  const keys = [
    "first-contentful-paint",
    "largest-contentful-paint",
    "speed-index",
    "total-blocking-time",
    "cumulative-layout-shift",
    "interactive",
  ];
  return keys.flatMap((k) => {
    const a = audits[k];
    if (!a) return [];
    const display =
      (a.displayValue as string | undefined) ??
      ((a.numericValue as number | undefined)?.toFixed(0) ?? "—");
    return [{ key: (a.title as string | undefined) ?? k, value: display }];
  });
}

function scoreColor(score: number | null): string {
  if (score == null) return "bg-slate-300 text-slate-700";
  if (score >= 0.9) return "bg-emerald-500 text-white";
  if (score >= 0.5) return "bg-amber-400 text-amber-950";
  return "bg-red-500 text-white";
}

export default function LighthouseTab({ url }: Props) {
  const [busy, setBusy] = useState(false);
  const [forMobile, setForMobile] = useState(true);
  const [view, setView] = useState<LighthouseView | null>(null);

  const trimmed = url.trim();
  const categories = useMemo(() => (view ? pickCategories(view) : []), [view]);
  const metrics = useMemo(() => (view ? pickKeyMetrics(view) : []), [view]);

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.onPageLighthouse({
        url: trimmed,
        forMobile,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? "Cached Lighthouse run ($0.00)"
        : `Lighthouse complete (${formatUsd(result.cost_usd)})`;
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
        Google Lighthouse audit — performance, accessibility, best-practices, SEO, and PWA scores
        plus the Core Web Vitals. 0.0025 USD per run.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>Form factor:</span>
          {(["mobile", "desktop"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="form-factor"
                checked={forMobile === (m === "mobile")}
                onChange={() => setForMobile(m === "mobile")}
                disabled={busy}
              />
              {m}
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "OnPageLighthouse" }}
            details={["0.0025 USD per run", "Cached for 24h"]}
            disabled={!trimmed || busy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !trimmed}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Running…" : "Run Lighthouse"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || !trimmed}
              title="Bypass cache and refetch from DataForSEO"
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
        </div>
      )}

      {categories.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((c) => (
              <div key={c.id} className="rounded border bg-white p-3 text-center">
                <div
                  className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${scoreColor(c.score)}`}
                >
                  {c.score != null ? Math.round(c.score * 100) : "—"}
                </div>
                <p className="text-xs font-medium text-slate-700">{c.title}</p>
              </div>
            ))}
          </div>

          {metrics.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Core Web Vitals</h3>
              <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 md:grid-cols-3">
                {metrics.map((m) => (
                  <li key={m.key} className="flex justify-between gap-3">
                    <span className="truncate text-slate-500" title={m.key}>
                      {m.key}
                    </span>
                    <span className="font-mono tabular-nums">{m.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        view ? (
          <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
            Lighthouse returned no category scores.
          </div>
        ) : (
          !busy && (
            <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
              Enter a URL above and click Run Lighthouse.
            </div>
          )
        )
      )}
    </div>
  );
}
