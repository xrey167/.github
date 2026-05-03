import { useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../components/CacheBadge";
import CostPreview from "../components/CostPreview";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { formatUsd } from "../lib/format";
import { tauriApi, type TopicBriefView } from "../lib/tauri";

/// Topic Research / Content Brief — orchestrates suggestions + SERP +
/// instant_pages into a single brief view. SEMrush calls this "SEO
/// Content Template" / "Topic Research"; here it's one Run button.
export default function TopicPage() {
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<TopicBriefView | null>(null);

  const trimmed = seed.trim();

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.topicResearch({
        seed: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? `Brief loaded from cache ($0.00)`
        : `Brief ready (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Topic Research</h2>
        <p className="text-sm text-slate-600">
          Builds a content brief by combining keyword suggestions, the live SERP top 10, and an
          instant-pages audit of the top 3 results. ~0.022 USD per fresh brief; $0 on cache hit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Seed keyword / topic</span>
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="best running shoes"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "TopicResearch" }}
            details={[
              "1× labs suggestions (0.0125)",
              "1× SERP organic depth 10 (0.002)",
              "3× on-page instant (0.0075)",
              "Cached for 7 days",
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
              {busy ? "Researching…" : "Build brief"}
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

      {view && (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CacheBadge fromCache={view.from_cache} fetchedAt={view.fetched_at} />
            <span>
              actual {formatUsd(view.cost_usd)} · estimated {formatUsd(view.estimated_usd)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              label="Target word count"
              value={
                view.recommended_word_count != null
                  ? view.recommended_word_count.toLocaleString()
                  : "—"
              }
              detail={
                view.min_word_count != null && view.max_word_count != null
                  ? `${view.min_word_count.toLocaleString()} – ${view.max_word_count.toLocaleString()}`
                  : undefined
              }
            />
            <Tile
              label="Total volume"
              value={view.total_volume_potential.toLocaleString()}
              detail="across related kw"
            />
            <Tile
              label="Avg difficulty"
              value={view.avg_difficulty > 0 ? view.avg_difficulty.toFixed(0) : "—"}
              detail="related kw KD"
            />
            <Tile
              label="Common H2/H3"
              value={view.common_headings.length.toString()}
              detail="in 2+ top pages"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">Headings to cover</h3>
              {view.common_headings.length === 0 ? (
                <p className="text-xs text-slate-500">
                  None of the top pages share H2/H3 headings yet.
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {view.common_headings.slice(0, 20).map((h, i) => (
                    <li key={i} className="rounded bg-slate-50 px-2 py-1">
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">
                Related keywords ({view.related_keywords.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="px-1 py-0.5 text-left">Keyword</th>
                      <th className="px-1 py-0.5 text-right">Vol</th>
                      <th className="px-1 py-0.5 text-right">KD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.related_keywords.map((k, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50">
                        <td className="px-1 py-1 font-mono">{k.keyword}</td>
                        <td className="px-1 py-1 text-right tabular-nums">
                          {k.search_volume?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-1 py-1 text-right tabular-nums">
                          {k.keyword_difficulty ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold">
              SERP top 10 (top 3 audited for word count + headings)
            </h3>
            <ol className="space-y-2">
              {view.top_results.map((r, i) => (
                <li key={i} className="rounded border bg-slate-50 p-2">
                  <div className="flex items-baseline gap-2 text-xs text-slate-500">
                    <span className="font-mono">#{r.rank}</span>
                    {r.domain && <span className="font-mono">{r.domain}</span>}
                    {r.word_count != null && (
                      <span className="text-emerald-700">
                        {r.word_count.toLocaleString()} words
                      </span>
                    )}
                    {r.headings.length > 0 && (
                      <span className="text-slate-500">
                        {r.headings.length} headings
                      </span>
                    )}
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm text-blue-600 hover:underline"
                  >
                    {r.title ?? r.url}
                  </a>
                  {r.headings.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                        Headings
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-4 text-xs text-slate-600">
                        {r.headings.map((h, j) => (
                          <li key={j} className="list-disc">
                            {h}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a seed keyword and click Build brief.
        </div>
      )}
    </section>
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
