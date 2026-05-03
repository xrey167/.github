import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import ExportMenu from "../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { formatError } from "../lib/errors";
import { formatUsd } from "../lib/format";
import { useProject } from "../lib/project-store";
import { tauriApi, type TrackedKeywordWithRank } from "../lib/tauri";

interface VisibilityRow {
  keyword: string;
  target: string;
  // null = check not yet attempted; false = checked, no AI Overview; true = present
  has_ai_overview: boolean | null;
  // null when has_ai_overview is null/false
  domain_mentioned: boolean | null;
  reference_count: number | null;
  reference_domains: string[];
  status: "pending" | "checking" | "done" | "error";
  error?: string;
}

const COLUMNS: ColumnDef<VisibilityRow, unknown>[] = [
  { id: "keyword", header: "Keyword", accessorKey: "keyword" },
  { id: "target", header: "Target", accessorKey: "target" },
  { id: "has_ai_overview", header: "AI Overview", accessorKey: "has_ai_overview" },
  { id: "domain_mentioned", header: "Domain mentioned", accessorKey: "domain_mentioned" },
  { id: "reference_count", header: "References", accessorKey: "reference_count" },
  // Comma-joined for CSV; TS table accessorFn returns strings.
  {
    id: "reference_domains",
    header: "Reference domains",
    accessorFn: (row) => row.reference_domains.join(", "),
  },
];

const COST_PER_LOOKUP = 0.0001;

/// Extract { url, domain } pairs from the AI Overview raw item. Robust to
/// the two shapes DataForSEO uses depending on whether the overview
/// contains references inline or in a separate items[*].references array.
function extractReferences(
  item: Record<string, unknown> | null,
): Array<{ url: string; domain: string }> {
  if (!item) return [];
  const out: Array<{ url: string; domain: string }> = [];
  const visit = (refs: unknown) => {
    if (!Array.isArray(refs)) return;
    for (const ref of refs) {
      const r = ref as Record<string, unknown>;
      const url = (r.url as string) ?? null;
      const domain = (r.domain as string) ?? (url ? safeDomain(url) : null);
      if (url && domain) out.push({ url, domain });
    }
  };
  visit(item.references);
  const items = item.items;
  if (Array.isArray(items)) {
    for (const sub of items) {
      visit((sub as Record<string, unknown>)?.references);
    }
  }
  return out;
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normaliseDomain(s: string): string {
  return s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export default function AiVisibilityPage() {
  const { active: activeProject } = useProject();

  const [target, setTarget] = useState<string>(activeProject?.target ?? "");
  const [keywordsText, setKeywordsText] = useState<string>("");
  const [rows, setRows] = useState<VisibilityRow[]>([]);
  const [running, setRunning] = useState(false);
  const [tracked, setTracked] = useState<TrackedKeywordWithRank[]>([]);

  // Auto-fill target when the active project changes — but only if the
  // user hasn't typed something else yet.
  useEffect(() => {
    if (activeProject?.target && !target) setTarget(activeProject.target);
  }, [activeProject?.target, target]);

  // Pull tracked keywords once; the "Load from tracked" button uses them.
  useEffect(() => {
    tauriApi
      .trackingList()
      .then(setTracked)
      .catch(() => setTracked([]));
  }, []);

  // Filter tracked keywords to those matching the current target domain.
  const trackedForTarget = useMemo(() => {
    const t = normaliseDomain(target);
    if (!t) return [];
    return tracked.filter((r) => normaliseDomain(r.keyword.target) === t);
  }, [tracked, target]);

  const keywords = useMemo(
    () =>
      keywordsText
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordsText],
  );

  const costAction = useMemo(
    () => ({ kind: "SerpAiOverview" as const }),
    [],
  );

  function loadFromTracked() {
    if (trackedForTarget.length === 0) {
      toast.error("No tracked keywords match this target domain.");
      return;
    }
    setKeywordsText(trackedForTarget.map((r) => r.keyword.keyword).join("\n"));
  }

  const checkOne = useCallback(
    async (kw: string, tgt: string): Promise<VisibilityRow> => {
      try {
        const view = await tauriApi.serpAiOverview({
          keyword: kw,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
        });
        const refs = extractReferences(view.item);
        const tgtDomain = normaliseDomain(tgt);
        const refDomains = Array.from(new Set(refs.map((r) => normaliseDomain(r.domain))));
        const has = view.item != null;
        return {
          keyword: kw,
          target: tgt,
          has_ai_overview: has,
          domain_mentioned: has ? refDomains.includes(tgtDomain) : null,
          reference_count: has ? refs.length : null,
          reference_domains: refDomains,
          status: "done",
        };
      } catch (e) {
        return {
          keyword: kw,
          target: tgt,
          has_ai_overview: null,
          domain_mentioned: null,
          reference_count: null,
          reference_domains: [],
          status: "error",
          error: formatError(e),
        };
      }
    },
    [],
  );

  async function run() {
    if (!target.trim() || keywords.length === 0) return;
    setRunning(true);

    // Seed pending rows so the UI shows progress.
    const seed: VisibilityRow[] = keywords.map((kw) => ({
      keyword: kw,
      target,
      has_ai_overview: null,
      domain_mentioned: null,
      reference_count: null,
      reference_domains: [],
      status: "pending",
    }));
    setRows(seed);

    // Sequential to stay well within the SerpLive 60 rpm bucket. For
    // larger sets this could fan out 5-wide; one keyword at a time
    // keeps the cost preview easy to reason about.
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "checking" } : r)),
      );
      const result = await checkOne(kw, target);
      setRows((prev) => prev.map((r, idx) => (idx === i ? result : r)));
    }
    setRunning(false);
    toast.success(
      `Checked ${keywords.length} keyword${keywords.length === 1 ? "" : "s"}.`,
    );
  }

  // Summary counts for the dashboard header.
  const summary = useMemo(() => {
    const done = rows.filter((r) => r.status === "done");
    const withAi = done.filter((r) => r.has_ai_overview);
    const mentioned = done.filter((r) => r.domain_mentioned);
    return {
      total: rows.length,
      done: done.length,
      withAi: withAi.length,
      mentioned: mentioned.length,
      rate: withAi.length > 0 ? (mentioned.length / withAi.length) * 100 : 0,
    };
  }, [rows]);

  const filenameStem = useMemo(
    () => `ai-visibility-${normaliseDomain(target) || "report"}`,
    [target],
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">AI Visibility</h2>
        <p className="text-sm text-slate-600">
          Check whether your domain appears in Google's AI Overview citations
          for a list of keywords. AI Overview is increasingly the first answer
          a user sees — being cited inside it matters more than the classic
          rank-1 spot for many informational queries.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Target domain</span>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={running}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="example.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-baseline justify-between font-medium text-slate-700">
              <span>Keywords ({keywords.length}, comma or newline separated)</span>
              {trackedForTarget.length > 0 && (
                <button
                  type="button"
                  onClick={loadFromTracked}
                  disabled={running}
                  className="text-xs font-normal text-blue-600 hover:underline disabled:opacity-50"
                >
                  Load {trackedForTarget.length} tracked keyword
                  {trackedForTarget.length === 1 ? "" : "s"}
                </button>
              )}
            </span>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              disabled={running}
              className="h-40 rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder={"seo tools\nbest crm\ntauri vs electron"}
              spellCheck={false}
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={costAction}
            details={[
              `${formatUsd(COST_PER_LOOKUP)} per keyword`,
              `${keywords.length} keyword${keywords.length === 1 ? "" : "s"} → ${formatUsd(COST_PER_LOOKUP * keywords.length)}`,
              "AI Overview is not cached — every check is fresh.",
            ]}
            disabled={running || keywords.length === 0 || !target.trim()}
          />
          <button
            type="button"
            onClick={run}
            disabled={running || keywords.length === 0 || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {running ? `Checking… (${rows.filter((r) => r.status === "done" || r.status === "error").length}/${rows.length})` : "Check AI visibility"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Keywords checked" value={summary.done.toLocaleString()} />
            <Stat
              label="With AI Overview"
              value={`${summary.withAi.toLocaleString()} / ${summary.done.toLocaleString()}`}
            />
            <Stat
              label="Domain cited"
              value={summary.mentioned.toLocaleString()}
              good={summary.mentioned > 0}
            />
            <Stat
              label="Citation rate"
              value={`${summary.rate.toFixed(0)}%`}
              good={summary.rate >= 30}
              warn={summary.rate > 0 && summary.rate < 30}
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Per-keyword breakdown</h3>
            <ExportMenu filenameStem={filenameStem} rows={rows} columns={COLUMNS} />
          </div>

          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left">Keyword</th>
                  <th className="px-2 py-1 text-center">AI Overview</th>
                  <th className="px-2 py-1 text-center">Domain cited</th>
                  <th className="px-2 py-1 text-right">Refs</th>
                  <th className="px-2 py-1 text-left">Reference domains</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t hover:bg-slate-50 ${
                      r.domain_mentioned === true ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    <td className="px-2 py-1 font-mono">{r.keyword}</td>
                    <td className="px-2 py-1 text-center">
                      {r.status === "pending" || r.status === "checking" ? (
                        <span className="text-slate-400">…</span>
                      ) : r.status === "error" ? (
                        <span className="text-red-700" title={r.error}>err</span>
                      ) : r.has_ai_overview ? (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] text-violet-800">
                          yes
                        </span>
                      ) : (
                        <span className="text-slate-400">no</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {r.domain_mentioned === true ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">
                          ✓
                        </span>
                      ) : r.domain_mentioned === false ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-slate-500">
                      {r.reference_count ?? "—"}
                    </td>
                    <td className="max-w-md truncate px-2 py-1 font-mono text-[11px] text-slate-500" title={r.reference_domains.join(", ")}>
                      {r.reference_domains.slice(0, 4).join(", ")}
                      {r.reference_domains.length > 4 && ` +${r.reference_domains.length - 4}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {rows.length === 0 && !running && (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          Pick a target domain, paste keywords (or load tracked ones), and click
          Check.
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: string;
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
