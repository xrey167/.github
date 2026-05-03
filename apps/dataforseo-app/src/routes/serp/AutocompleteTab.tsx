import { useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type AutocompleteView } from "../../lib/tauri";

export default function AutocompleteTab() {
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AutocompleteView | null>(null);

  const trimmed = keyword.trim();

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.serpAutocomplete({
        keyword: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
      });
      setView(result);
      toast.success(`${result.items.length} suggestions (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Google Autocomplete suggestions for a seed keyword. Cheap content-ideation source —
        0.002 USD per call regardless of how many suggestions come back.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Seed keyword</span>
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
            action={{ kind: "SerpAutocomplete" }}
            details={["0.002 USD per call"]}
            disabled={busy || !trimmed}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !trimmed}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Get suggestions"}
          </button>
        </div>
      </div>

      {view ? (
        view.items.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500">
              {view.items.length} suggestions for &ldquo;{view.keyword}&rdquo; ·{" "}
              {formatUsd(view.cost_usd)}
            </p>
            <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {view.items.map((s, i) => (
                <li
                  key={i}
                  className="rounded border bg-white px-2 py-1 font-mono text-sm hover:bg-slate-50"
                >
                  <span className="mr-2 text-xs text-slate-400">#{s.rank_absolute ?? i + 1}</span>
                  {s.suggestion ?? "—"}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
            No suggestions returned.
          </div>
        )
      ) : (
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Enter a seed keyword and click Get suggestions.
          </div>
        )
      )}
    </div>
  );
}
