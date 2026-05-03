import { useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../components/CacheBadge";
import CostPreview from "../components/CostPreview";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { formatUsd } from "../lib/format";
import { tauriApi, type AppDataView } from "../lib/tauri";

type Store = "google_play" | "apple";
type Mode = "searches" | "reviews";

interface AppItem {
  title: string | null;
  description: string | null;
  developer: string | null;
  rating: number | null;
  rating_count: number | null;
  url: string | null;
  app_id: string | null;
  category: string | null;
  // review-mode fields
  review_text: string | null;
  review_author: string | null;
}

function pickItem(raw: Record<string, unknown>): AppItem {
  return {
    title: (raw.title as string | undefined) ?? null,
    description: (raw.description as string | undefined) ?? null,
    developer:
      (raw.developer as string | undefined) ??
      (raw.author as string | undefined) ??
      null,
    rating: (raw.rating as number | undefined) ?? null,
    rating_count: (raw.rating_count as number | undefined) ?? null,
    url: (raw.url as string | undefined) ?? null,
    app_id:
      (raw.app_id as string | undefined) ??
      (raw.id as string | undefined) ??
      null,
    category:
      (raw.category as string | undefined) ??
      (raw.genre as string | undefined) ??
      null,
    review_text: (raw.review_text as string | undefined) ?? null,
    review_author: (raw.author as string | undefined) ?? null,
  };
}

export default function AppsPage() {
  const [store, setStore] = useState<Store>("google_play");
  const [mode, setMode] = useState<Mode>("searches");
  const [query, setQuery] = useState("");
  const [limit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AppDataView | null>(null);

  const trimmed = query.trim();

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      const args = {
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit,
        useCache,
      };
      const result = await (mode === "searches"
        ? store === "google_play"
          ? tauriApi.appDataGooglePlayAppSearches({ keyword: trimmed, ...args })
          : tauriApi.appDataAppleAppSearches({ keyword: trimmed, ...args })
        : store === "google_play"
          ? tauriApi.appDataGooglePlayAppReviews({ appId: trimmed, ...args })
          : tauriApi.appDataAppleAppReviews({ appId: trimmed, ...args }));
      setView(result);
      const note = result.from_cache
        ? `Cached (${result.items_count} rows, $0.00)`
        : `${result.items_count} rows (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const items = view ? (view.items as Array<Record<string, unknown>>).map(pickItem) : [];

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Apps</h2>
        <p className="text-sm text-slate-600">
          Mobile app store search + review monitoring (Google Play and App Store). 0.002 USD per
          request, cached for 3 days.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_180px_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            {mode === "searches" ? "Search keyword" : "App ID"}
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder={mode === "searches" ? "photo editor" : "com.example.app"}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">Store</span>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value as Store)}
            disabled={busy}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="google_play">Google Play</option>
            <option value="apple">App Store</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            disabled={busy}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="searches">App search</option>
            <option value="reviews">App reviews</option>
          </select>
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "AppData" }}
            details={["0.002 USD per request", `Limit ${limit}`]}
            disabled={busy || !trimmed}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !trimmed}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Loading…" : "Run"}
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
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CacheBadge fromCache={view.from_cache} fetchedAt={view.fetched_at} />
          <span>
            {view.items_count} of {view.total_count.toLocaleString()} · actual{" "}
            {formatUsd(view.cost_usd)} · estimated {formatUsd(view.estimated_usd)}
          </span>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded border bg-white">
          {mode === "searches" ? (
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left">App</th>
                  <th className="px-2 py-1 text-left">Developer</th>
                  <th className="px-2 py-1 text-left">Category</th>
                  <th className="px-2 py-1 text-right">Rating</th>
                  <th className="px-2 py-1 text-right">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-1">
                      {it.url ? (
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {it.title ?? "—"}
                        </a>
                      ) : (
                        <span>{it.title ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-2 py-1">{it.developer ?? "—"}</td>
                    <td className="px-2 py-1">{it.category ?? "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {it.rating != null ? it.rating.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {it.rating_count?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ol className="divide-y">
              {items.map((it, i) => (
                <li key={i} className="p-3">
                  <div className="flex items-baseline gap-2 text-xs text-slate-500">
                    {it.review_author && <span className="font-medium text-slate-700">{it.review_author}</span>}
                    {it.rating != null && <span className="text-amber-600">★ {it.rating.toFixed(1)}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{it.review_text ?? it.title ?? "—"}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        view ? (
          <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
            No results.
          </div>
        ) : (
          !busy && (
            <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
              Enter a {mode === "searches" ? "keyword" : "Google Play package or App Store ID"} and click Run.
            </div>
          )
        )
      )}
    </section>
  );
}
