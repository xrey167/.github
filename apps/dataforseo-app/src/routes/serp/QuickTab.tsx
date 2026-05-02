import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { formatUsd } from "../../lib/format";
import { tauriApi, type SerpLiveBatch, type SerpResultItem } from "../../lib/tauri";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";

const KIND_COLORS: Record<string, string> = {
  organic: "bg-slate-100 text-slate-700",
  featured_snippet: "bg-amber-100 text-amber-800",
  people_also_ask: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  ai_overview: "bg-violet-100 text-violet-800",
};

function safePathname(url: string): string {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}

export default function QuickTab() {
  const [keyword, setKeyword] = useState("");
  const [depth, setDepth] = useState(10);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<SerpLiveBatch | null>(null);

  const trimmed = keyword.trim();

  const exportColumns = useMemo<ColumnDef<SerpResultItem, unknown>[]>(
    () => [
      { id: "rank_absolute", header: "Position", accessorKey: "rank_absolute" },
      { id: "kind", header: "Type", accessorKey: "kind" },
      { id: "domain", header: "Domain", accessorKey: "domain" },
      { id: "url", header: "URL", accessorKey: "url" },
      { id: "title", header: "Title", accessorKey: "title" },
      { id: "description", header: "Description", accessorKey: "description" },
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
      const result = await tauriApi.serpLive({
        keyword: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        depth,
      });
      setBatch(result);
      toast.success(`${result.items.length} results (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2">
          <label htmlFor="serp-kw" className="text-sm font-medium text-slate-700">
            Keyword
          </label>
          <input
            id="serp-kw"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo agentur"
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
            {batch.items.length} items for &ldquo;{batch.keyword}&rdquo; · actual cost {formatUsd(batch.cost_usd)} (estimated{" "}
            {formatUsd(batch.estimated_usd)})
          </span>
          <ExportMenu
            filenameStem={`serp-${batch.keyword}`}
            rows={batch.items}
            columns={exportColumns}
          />
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {batch?.items.map((item, i) => (
          <SerpRow key={`${item.url ?? i}-${i}`} item={item} />
        )) ?? null}
        {batch && batch.items.length === 0 && (
          <li className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            No items returned.
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

function SerpRow({ item }: { item: SerpResultItem }) {
  const colorClass = KIND_COLORS[item.kind] ?? "bg-slate-100 text-slate-700";
  return (
    <li className="rounded border bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {item.rank_absolute != null && <span className="font-mono">#{item.rank_absolute}</span>}
        <span className={`rounded px-1.5 py-0.5 ${colorClass}`}>{item.kind}</span>
        {item.domain && <span className="font-mono">{item.domain}</span>}
      </div>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-blue-600 hover:underline"
        >
          {item.title ?? safePathname(item.url)}
        </a>
      )}
      {item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}
    </li>
  );
}
