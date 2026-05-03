import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type AiOverviewView } from "../../lib/tauri";

interface OverviewSlice {
  text: string | null;
  references: Array<{ url: string; title: string | null; domain: string | null }>;
}

function pick(view: AiOverviewView): OverviewSlice {
  const item = view.item ?? {};
  // The AI Overview shape is one of:
  // - items[].text + items[].references[]
  // - text directly on the result + references[]
  // We try both, preferring the items[0].
  const items = (item as Record<string, unknown>).items as Array<Record<string, unknown>> | undefined;
  const first = items?.[0] ?? (item as Record<string, unknown>);
  const text = (first?.text as string | undefined) ?? null;
  const refs =
    ((first?.references as Array<Record<string, unknown>> | undefined) ?? []).map((r) => ({
      url: (r.url as string) ?? "",
      title: (r.title as string | undefined) ?? null,
      domain: (r.domain as string | undefined) ?? null,
    }));
  return { text, references: refs };
}

export default function AiOverviewTab() {
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AiOverviewView | null>(null);

  const trimmed = keyword.trim();
  const slice = useMemo(() => (view ? pick(view) : null), [view]);

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.serpAiOverview({
        keyword: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
      });
      setView(result);
      toast.success(`Loaded (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Pulls the cached Google AI Overview for a keyword (if one exists). Useful for tracking AI
        visibility — does this query trigger an AI Overview, what does it say, and which sources
        are cited? 0.0001 USD per pull.
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
            placeholder="how does seo work"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "SerpAiOverview" }}
            details={["0.0001 USD per pull (cached overviews)"]}
            disabled={busy || !trimmed}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !trimmed}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Pull overview"}
          </button>
        </div>
      </div>

      {view && slice && (
        <>
          {slice.text ? (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">AI Overview text</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {slice.text}
              </p>
            </div>
          ) : (
            <div className="rounded border bg-amber-50 p-4 text-sm text-amber-900">
              No AI Overview cached for this keyword. Either Google doesn't show one, or it hasn't
              been indexed by DataForSEO yet.
            </div>
          )}
          {slice.references.length > 0 && (
            <div className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold">
                References ({slice.references.length})
              </h3>
              <ol className="space-y-1 text-sm">
                {slice.references.map((r, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-400">#{i + 1}</span>
                    {r.domain && (
                      <span className="font-mono text-xs text-slate-500">{r.domain}</span>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {r.title ?? r.url}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a keyword and click Pull overview.
        </div>
      )}
    </div>
  );
}
