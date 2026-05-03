import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import ExportMenu from "../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { formatError } from "../lib/errors";
import { formatUsd } from "../lib/format";
import { tauriApi } from "../lib/tauri";

interface KeywordSerp {
  keyword: string;
  // top-N organic URLs for the keyword (after filtering to kind=organic)
  urls: string[];
  status: "pending" | "fetching" | "done" | "error";
  error?: string;
}

interface Cluster {
  id: number;
  keywords: string[];
  // URLs shared by every member keyword (intersection of their top-N URLs)
  shared_urls: string[];
}

const COST_PER_KEYWORD = 0.002;
const DEFAULT_DEPTH = 10;
const DEFAULT_OVERLAP_THRESHOLD = 3;

/// Strip protocol + www. + path so two URLs that differ only in those
/// parts cluster together (sometimes Google returns canonical with www,
/// sometimes without; the path differences across keywords are exactly
/// what we DO care about for clustering, but for the "is this the same
/// canonical result" question stripping the URL fragment + trailing
/// slash is enough). We keep the path because two articles on the same
/// domain shouldn't cluster.
function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

/// Greedy clustering: walk keywords in order, place each into the first
/// existing cluster whose seed shares >= threshold URLs with it; otherwise
/// start a new cluster. O(N²) but fine for the typical 50-keyword input.
function cluster(
  serps: KeywordSerp[],
  threshold: number,
): Cluster[] {
  const completed = serps.filter((s) => s.status === "done" && s.urls.length > 0);
  // Per-keyword normalised URL sets, in input order.
  const sets: Array<{ keyword: string; set: Set<string> }> = completed.map((s) => ({
    keyword: s.keyword,
    set: new Set(s.urls.map(normaliseUrl)),
  }));

  // intersection helper
  const overlap = (a: Set<string>, b: Set<string>): number => {
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n;
  };

  const clusters: Array<{ id: number; members: typeof sets }> = [];
  let nextId = 1;

  outer: for (const item of sets) {
    for (const c of clusters) {
      // Compare to first member of cluster (the seed). Cheaper than mean
      // overlap and produces effectively the same partitioning at this
      // scale.
      if (overlap(c.members[0].set, item.set) >= threshold) {
        c.members.push(item);
        continue outer;
      }
    }
    clusters.push({ id: nextId++, members: [item] });
  }

  return clusters.map((c) => {
    // Shared URLs across all members.
    const [first, ...rest] = c.members;
    const shared = new Set<string>(first.set);
    for (const m of rest) {
      for (const u of shared) if (!m.set.has(u)) shared.delete(u);
    }
    return {
      id: c.id,
      keywords: c.members.map((m) => m.keyword),
      shared_urls: [...shared].sort(),
    };
  });
}

const CLUSTER_COLUMNS: ColumnDef<Cluster, unknown>[] = [
  { id: "id", header: "Cluster", accessorKey: "id" },
  { id: "size", header: "Size", accessorFn: (row) => row.keywords.length },
  {
    id: "keywords",
    header: "Keywords",
    accessorFn: (row) => row.keywords.join(", "),
  },
  {
    id: "shared",
    header: "Shared URLs",
    accessorFn: (row) => row.shared_urls.join(", "),
  },
];

export default function KeywordClusteringPage() {
  const [keywordsText, setKeywordsText] = useState("");
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [threshold, setThreshold] = useState(DEFAULT_OVERLAP_THRESHOLD);
  const [serps, setSerps] = useState<KeywordSerp[]>([]);
  const [running, setRunning] = useState(false);

  const keywords = useMemo(
    () =>
      keywordsText
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordsText],
  );

  // Pass keywords.length to CostPreview so the headline figure shows the
  // total batch cost up front, not the per-call cost.
  const costAction = useMemo(
    () =>
      ({ kind: "Serp", count: keywords.length, mode: "live", depth, extra_params: 0 }) as const,
    [depth, keywords.length],
  );

  // Cancellation ref — set on unmount so an in-flight sequential loop
  // stops calling DataForSEO if the user navigates away. Saves budget
  // on long lists.
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const totalCost = COST_PER_KEYWORD * keywords.length;

  async function run() {
    if (keywords.length === 0) return;
    setRunning(true);

    const seed: KeywordSerp[] = keywords.map((kw) => ({
      keyword: kw,
      urls: [],
      status: "pending",
    }));
    setSerps(seed);

    // Sequential — keeps within the SerpLive 60 rpm bucket and gives the
    // user clear progress signal. For 50+ keyword sets this could fan
    // out 5-wide; we prefer predictable UX over maximum throughput.
    let processed = 0;
    for (let i = 0; i < keywords.length; i++) {
      if (cancelledRef.current) break; // user left page → stop spending
      const kw = keywords[i];
      setSerps((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "fetching" } : r)),
      );
      try {
        const batch = await tauriApi.serpLive({
          keyword: kw,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          depth,
        });
        if (cancelledRef.current) break;
        const urls = batch.items
          .filter((it) => it.kind === "organic" && it.url)
          .map((it) => it.url as string);
        setSerps((prev) =>
          prev.map((r, idx) =>
            idx === i ? { keyword: kw, urls, status: "done" } : r,
          ),
        );
      } catch (e) {
        if (cancelledRef.current) break;
        setSerps((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { keyword: kw, urls: [], status: "error", error: formatError(e) }
              : r,
          ),
        );
      }
      processed++;
    }
    setRunning(false);
    if (!cancelledRef.current) {
      toast.success(`Fetched SERPs for ${processed} keywords.`);
    }
  }

  // Live-recompute clusters when serps or threshold change.
  const clusters = useMemo(() => cluster(serps, threshold), [serps, threshold]);

  const summary = useMemo(() => {
    const done = serps.filter((s) => s.status === "done").length;
    const errored = serps.filter((s) => s.status === "error").length;
    return {
      total: serps.length,
      done,
      errored,
      clusters: clusters.length,
      // % of keywords that ended up in a multi-member cluster.
      grouped_pct:
        done > 0
          ? (clusters.filter((c) => c.keywords.length > 1).reduce((acc, c) => acc + c.keywords.length, 0) /
              done) *
            100
          : 0,
    };
  }, [serps, clusters]);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Keyword Clustering</h2>
        <p className="text-sm text-slate-600">
          Group keywords by SERP overlap. Two keywords are in the same cluster
          when at least N of their top-{depth} organic URLs match — meaning
          Google treats them as the same intent and one page can rank for both.
          Decides what gets one article vs separate articles.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            Keywords ({keywords.length}, comma or newline separated)
          </span>
          <textarea
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            disabled={running}
            className="h-48 rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder={"best crm\ncrm software\ncrm tools\nproject management software\nbest project management"}
            spellCheck={false}
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={costAction}
            details={[
              `${formatUsd(COST_PER_KEYWORD)} per keyword × ${keywords.length} = ${formatUsd(totalCost)}`,
              `Depth ${depth} (top ${depth} organic per keyword)`,
              "Live SERP — fresh for clustering accuracy.",
            ]}
            disabled={running || keywords.length === 0}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Depth: {depth}</span>
            <input
              type="range"
              min={10}
              max={20}
              step={5}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value, 10))}
              disabled={running}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">
              Overlap threshold: {threshold} URL{threshold === 1 ? "" : "s"}
            </span>
            <input
              type="range"
              min={1}
              max={Math.min(8, depth)}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
            />
            <span className="text-[11px] text-slate-500">
              Lower = looser clusters, higher = tighter. 3 of top-10 is the
              standard default.
            </span>
          </label>
          <button
            type="button"
            onClick={run}
            disabled={running || keywords.length === 0}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {running
              ? `Fetching… (${serps.filter((s) => s.status === "done" || s.status === "error").length}/${serps.length})`
              : "Cluster keywords"}
          </button>
        </div>
      </div>

      {serps.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Keywords" value={summary.total} />
            <Stat label="SERPs fetched" value={summary.done} warn={summary.errored > 0} />
            <Stat label="Clusters" value={summary.clusters} />
            <Stat
              label="Grouped"
              value={`${summary.grouped_pct.toFixed(0)}%`}
              good={summary.grouped_pct >= 50}
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Clusters ({clusters.length}) — adjust threshold to re-partition
            </h3>
            <ExportMenu
              filenameStem="keyword-clusters"
              rows={clusters}
              columns={CLUSTER_COLUMNS}
            />
          </div>

          <div className="flex flex-col gap-3">
            {clusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} />
            ))}
          </div>

          {summary.errored > 0 && (
            <div className="rounded border bg-amber-50 p-3 text-xs text-amber-800">
              {summary.errored} keyword{summary.errored === 1 ? "" : "s"} failed
              to fetch — those are excluded from the clustering. Click Cluster
              again to retry.
            </div>
          )}
        </>
      )}

      {serps.length === 0 && !running && (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          Paste a list of keywords (typically 5–50), pick a depth + overlap
          threshold, and click Cluster.
        </div>
      )}
    </section>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const isSolo = cluster.keywords.length === 1;
  return (
    <div
      className={`rounded border bg-white p-3 ${
        isSolo ? "border-slate-200" : "border-emerald-300"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-semibold">Cluster {cluster.id}</span>
          <span className="ml-2 text-xs text-slate-500">
            {cluster.keywords.length} keyword{cluster.keywords.length === 1 ? "" : "s"}
            {!isSolo && cluster.shared_urls.length > 0 && (
              <> · {cluster.shared_urls.length} shared URL{cluster.shared_urls.length === 1 ? "" : "s"}</>
            )}
          </span>
        </div>
        {isSolo && (
          <span className="text-[11px] text-slate-400">unique intent</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {cluster.keywords.map((kw) => (
          <span
            key={kw}
            className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
          >
            {kw}
          </span>
        ))}
      </div>
      {!isSolo && cluster.shared_urls.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Shared URLs
          </div>
          <ul className="mt-1 space-y-0.5">
            {cluster.shared_urls.slice(0, 5).map((u) => (
              <li key={u} className="font-mono text-xs text-slate-600">
                {u}
              </li>
            ))}
            {cluster.shared_urls.length > 5 && (
              <li className="text-[11px] italic text-slate-400">
                +{cluster.shared_urls.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: number | string;
  good?: boolean;
  warn?: boolean;
}) {
  const cls = good
    ? "text-emerald-700"
    : warn
      ? "text-amber-700"
      : "text-slate-800";
  return (
    <div className="rounded border bg-white p-3">
      <div className={`text-xl font-semibold tabular-nums ${cls}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
