import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type MapsLiveBatch, type MapsResultItem } from "../../lib/tauri";

export default function MapsTab() {
  const [keyword, setKeyword] = useState("");
  const [depth, setDepth] = useState(10);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<MapsLiveBatch | null>(null);

  const trimmed = keyword.trim();

  const exportColumns = useMemo<ColumnDef<MapsResultItem, unknown>[]>(
    () => [
      { id: "rank_absolute", header: "Position", accessorKey: "rank_absolute" },
      { id: "title", header: "Name", accessorKey: "title" },
      { id: "category", header: "Category", accessorKey: "category" },
      { id: "rating", header: "Rating", accessorKey: "rating" },
      { id: "rating_count", header: "Reviews", accessorKey: "rating_count" },
      { id: "address", header: "Address", accessorKey: "address" },
      { id: "phone", header: "Phone", accessorKey: "phone" },
      { id: "url", header: "Website", accessorKey: "url" },
    ],
    [],
  );

  const costAction = useMemo(
    () =>
      ({
        kind: "Serp",
        count: 1,
        mode: "live",
        depth,
        extra_params: 0,
      }) as const,
    [depth],
  );

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.serpMapsLive({
        keyword: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        depth,
      });
      setBatch(result);
      toast.success(`${result.items.length} places (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Local business listings from Google Maps — business name, address, phone, rating, and website. Same
        0.002 USD/row cost as organic.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2">
          <label htmlFor="maps-kw" className="text-sm font-medium text-slate-700">
            Keyword
          </label>
          <input
            id="maps-kw"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="coffee shops berlin"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-3">
          <CostPreview
            action={costAction}
            details={[
              `Depth ${depth} (${depth / 10}x base)`,
              `Location ${DEFAULT_LOCATION}, Language ${DEFAULT_LANGUAGE}`,
            ]}
            disabled={!trimmed || busy}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Depth: {depth}</span>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value, 10))}
            />
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !trimmed}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {batch && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {batch.items.length} places for &ldquo;{batch.keyword}&rdquo; · actual {formatUsd(batch.cost_usd)} ·
            estimated {formatUsd(batch.estimated_usd)}
          </span>
          <ExportMenu
            filenameStem={`maps-${batch.keyword}`}
            rows={batch.items}
            columns={exportColumns}
          />
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {batch?.items.map((item, i) => (
          <MapsRow key={`${item.place_id ?? item.title ?? i}-${i}`} item={item} />
        )) ?? null}
        {batch && batch.items.length === 0 && (
          <li className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            No places returned.
          </li>
        )}
        {!batch && (
          <li className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Enter a keyword above and click Run.
          </li>
        )}
      </ol>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const pct = Math.round((rating - full) * 100);
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-amber-500">
      {"★".repeat(full)}
      {pct >= 50 ? "½" : ""}
      <span className="ml-1 text-slate-600">{rating.toFixed(1)}</span>
    </span>
  );
}

function MapsRow({ item }: { item: MapsResultItem }) {
  return (
    <li className="rounded border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {item.rank_absolute != null && (
          <span className="font-mono">#{item.rank_absolute}</span>
        )}
        {item.category && (
          <span className="rounded bg-teal-100 px-1.5 py-0.5 text-teal-800">{item.category}</span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:underline"
          >
            {item.title ?? item.domain ?? item.url}
          </a>
        ) : (
          <span className="font-medium text-slate-800">{item.title ?? "—"}</span>
        )}
        {item.rating != null && <StarRating rating={item.rating} />}
        {item.rating_count != null && (
          <span className="text-xs text-slate-500">({item.rating_count.toLocaleString()} reviews)</span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-600">
        {item.address && <span>{item.address}</span>}
        {item.phone && <span className="font-mono">{item.phone}</span>}
      </div>
    </li>
  );
}
