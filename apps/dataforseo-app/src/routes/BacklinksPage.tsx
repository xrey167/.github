import { useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import { formatCount, formatUsd } from "../lib/format";
import { tauriApi, type BacklinksSummaryView } from "../lib/tauri";

export default function BacklinksPage() {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<BacklinksSummaryView | null>(null);
  const [useCache, setUseCache] = useState(true);

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksSummary({
        target: trimmed,
        useCache,
      });
      setSummary(result);
      const note = result.from_cache
        ? "from cache"
        : `${formatUsd(result.cost_usd)} fresh`;
      toast.success(`Loaded ${trimmed} (${note})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Backlinks</h2>
        <p className="text-sm text-slate-600">
          Aggregate backlink profile for any domain — total links, referring
          domains, dofollow split, TLD distribution. The summary endpoint is
          cheap (one request, ~0.02 USD) and cached for 24 hours, so checking
          a domain you've looked at recently is free.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Reminder: DataForSEO's Backlinks family has a 100 USD/month minimum
          spend. The commitment can be used across all DataForSEO APIs but
          must be consumed monthly. Plan accordingly before activating.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Target domain</span>
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
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{
              kind: "Backlinks",
              target_count: 1,
              rows_per_target: 1,
            }}
            details={[
              "Single backlinks_summary request",
              useCache
                ? "Cache reused if last fetch <24h"
                : "Cache disabled",
            ]}
            disabled={busy || !target.trim()}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              disabled={busy}
            />
            Use 24h cache
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Load summary"}
          </button>
        </div>
      </div>

      {summary && <SummaryView view={summary} />}

      {!summary && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a domain above and click Load summary.
        </div>
      )}
    </section>
  );
}

function SummaryView({ view }: { view: BacklinksSummaryView }) {
  const s = view.summary as Record<string, unknown>;
  const num = (k: string) => {
    const v = s?.[k];
    return typeof v === "number" ? v : null;
  };

  const tiles = [
    { label: "Total backlinks", value: num("backlinks") },
    { label: "Referring domains", value: num("referring_domains") },
    { label: "Referring main domains", value: num("referring_main_domains") },
    { label: "Referring pages", value: num("referring_pages") },
    { label: "Dofollow", value: num("dofollow_backlinks") },
    { label: "Nofollow", value: num("nofollow_backlinks") },
    { label: "Broken backlinks", value: num("broken_backlinks") },
    { label: "Domain rank", value: num("rank") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.target}</strong>
        {view.from_cache && (
          <span className="rounded bg-slate-200 px-1 py-0.5">cache</span>
        )}
        {view.fetched_at && (
          <span>fetched {view.fetched_at.slice(0, 16)}</span>
        )}
        <span className="ml-auto">
          actual {formatUsd(view.cost_usd)} · estimated{" "}
          {formatUsd(view.estimated_usd)}
        </span>
      </div>

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

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          Raw response (debug)
        </summary>
        <pre className="mt-2 overflow-x-auto text-[11px]">
          {JSON.stringify(view.summary, null, 2)}
        </pre>
      </details>
    </div>
  );
}
