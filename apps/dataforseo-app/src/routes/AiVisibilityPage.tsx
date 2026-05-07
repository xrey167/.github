import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import ExportMenu from "../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { estimate } from "../lib/cost";
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
  // AI Mode (Google's experimental conversational search). Populated only
  // when the "Include AI Mode" toggle is on; otherwise null.
  has_ai_mode: boolean | null;
  domain_in_ai_mode: boolean | null;
  ai_mode_domains: string[];
  status: "pending" | "checking" | "done" | "error";
  error?: string;
}

const COLUMNS: ColumnDef<VisibilityRow, unknown>[] = [
  { id: "keyword", header: "Keyword", accessorKey: "keyword" },
  { id: "target", header: "Target", accessorKey: "target" },
  { id: "has_ai_overview", header: "AI Overview", accessorKey: "has_ai_overview" },
  { id: "domain_mentioned", header: "AIO domain cited", accessorKey: "domain_mentioned" },
  { id: "reference_count", header: "AIO references", accessorKey: "reference_count" },
  // Comma-joined for CSV; TS table accessorFn returns strings.
  {
    id: "reference_domains",
    header: "AIO reference domains",
    accessorFn: (row) => row.reference_domains.join(", "),
  },
  { id: "has_ai_mode", header: "AI Mode", accessorKey: "has_ai_mode" },
  { id: "domain_in_ai_mode", header: "AI Mode cited", accessorKey: "domain_in_ai_mode" },
  {
    id: "ai_mode_domains",
    header: "AI Mode domains",
    accessorFn: (row) => row.ai_mode_domains.join(", "),
  },
];

// Single source of truth for per-call cost lives in cost.ts so it stays
// in sync with the Usage tab's estimate.
const COST_AI_OVERVIEW = estimate({ kind: "SerpAiOverview" });
const COST_AI_MODE = estimate({
  kind: "Serp",
  count: 1,
  mode: "live",
  depth: 10,
  extra_params: 0,
});

const AI_MODE_DEPTH = 10;

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
  const [locationCode, setLocationCode] = useState<number>(DEFAULT_LOCATION);
  const [languageCode, setLanguageCode] = useState<string>(DEFAULT_LANGUAGE);
  const [includeAiMode, setIncludeAiMode] = useState(false);
  const [rows, setRows] = useState<VisibilityRow[]>([]);
  const [running, setRunning] = useState(false);
  const [tracked, setTracked] = useState<TrackedKeywordWithRank[]>([]);

  // Cancellation ref — set on unmount so the sequential loop stops
  // making API calls if the user navigates away mid-run. Saves DataForSEO
  // budget on long lists.
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

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
    async (
      kw: string,
      tgt: string,
      loc: number,
      lang: string,
      withAiMode: boolean,
    ): Promise<VisibilityRow> => {
      const tgtDomain = normaliseDomain(tgt);

      // Default response shape — populated below as each request lands.
      const out: VisibilityRow = {
        keyword: kw,
        target: tgt,
        has_ai_overview: null,
        domain_mentioned: null,
        reference_count: null,
        reference_domains: [],
        has_ai_mode: null,
        domain_in_ai_mode: null,
        ai_mode_domains: [],
        status: "done",
      };

      try {
        const view = await tauriApi.serpAiOverview({
          keyword: kw,
          locationCode: loc,
          languageCode: lang,
        });
        const refs = extractReferences(view.item);
        const refDomains = Array.from(new Set(refs.map((r) => normaliseDomain(r.domain))));
        const has = view.item != null;
        out.has_ai_overview = has;
        out.domain_mentioned = has ? refDomains.includes(tgtDomain) : null;
        out.reference_count = has ? refs.length : null;
        out.reference_domains = refDomains;
      } catch (e) {
        // If the AIO call fails the row is an error — don't try AI Mode.
        return {
          ...out,
          status: "error",
          error: formatError(e),
        };
      }

      if (withAiMode) {
        try {
          const aiMode = await tauriApi.serpAiModeLive({
            keyword: kw,
            locationCode: loc,
            languageCode: lang,
            depth: AI_MODE_DEPTH,
          });
          const aiDomains = Array.from(
            new Set(
              aiMode.items
                .map((it) => (it.domain ? normaliseDomain(it.domain) : null))
                .filter((d): d is string => !!d),
            ),
          );
          out.has_ai_mode = aiMode.items.length > 0;
          out.domain_in_ai_mode = out.has_ai_mode ? aiDomains.includes(tgtDomain) : null;
          out.ai_mode_domains = aiDomains;
        } catch (e) {
          // AI Mode failed but AIO succeeded — surface as a partial result
          // rather than failing the whole row.
          out.error = `AI Mode: ${formatError(e)}`;
        }
      }

      return out;
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
      has_ai_mode: null,
      domain_in_ai_mode: null,
      ai_mode_domains: [],
      status: "pending",
    }));
    setRows(seed);

    // Sequential to stay well within the SerpLive 60 rpm bucket. For
    // larger sets this could fan out 5-wide; one keyword at a time
    // keeps the cost preview easy to reason about.
    let processed = 0;
    for (let i = 0; i < keywords.length; i++) {
      if (cancelledRef.current) break; // user navigated away → stop spending
      const kw = keywords[i];
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "checking" } : r)),
      );
      const result = await checkOne(kw, target, locationCode, languageCode, includeAiMode);
      if (cancelledRef.current) break;
      setRows((prev) => prev.map((r, idx) => (idx === i ? result : r)));
      processed++;
    }
    setRunning(false);
    if (!cancelledRef.current) {
      toast.success(
        `Checked ${processed} keyword${processed === 1 ? "" : "s"}.`,
      );
    }
  }

  // Summary counts for the dashboard header.
  const summary = useMemo(() => {
    const done = rows.filter((r) => r.status === "done");
    const withAi = done.filter((r) => r.has_ai_overview);
    const mentioned = done.filter((r) => r.domain_mentioned);
    const withAiMode = done.filter((r) => r.has_ai_mode);
    const mentionedAiMode = done.filter((r) => r.domain_in_ai_mode);
    return {
      total: rows.length,
      done: done.length,
      withAi: withAi.length,
      mentioned: mentioned.length,
      rate: withAi.length > 0 ? (mentioned.length / withAi.length) * 100 : 0,
      withAiMode: withAiMode.length,
      mentionedAiMode: mentionedAiMode.length,
      rateAiMode:
        withAiMode.length > 0 ? (mentionedAiMode.length / withAiMode.length) * 100 : 0,
    };
  }, [rows]);

  // Per-keyword cost = AI Overview always, plus AI Mode when toggled on.
  const perKeywordCost = COST_AI_OVERVIEW + (includeAiMode ? COST_AI_MODE : 0);

  const filenameStem = useMemo(
    () => `ai-visibility-${normaliseDomain(target) || "report"}`,
    [target],
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">AI Visibility</h2>
        <p className="text-sm text-slate-600">
          Check whether your domain appears in Google's AI surfaces — AI Overview
          citations, and optionally AI Mode results — for a list of keywords. AI
          surfaces are increasingly the first answer a user sees, so being cited
          inside them matters more than the classic rank-1 spot for many
          informational queries.
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
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Location code</span>
              <input
                type="number"
                value={locationCode}
                onChange={(e) => setLocationCode(parseInt(e.target.value, 10) || DEFAULT_LOCATION)}
                disabled={running}
                className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
                title="DataForSEO location_code — 2840 = US, 2276 = DE, 2826 = UK"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Language</span>
              <input
                type="text"
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                disabled={running}
                className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
                placeholder="en"
                maxLength={5}
              />
            </label>
          </div>
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
              includeAiMode
                ? `${formatUsd(perKeywordCost)} per keyword (AIO + AI Mode)`
                : `${formatUsd(perKeywordCost)} per keyword`,
              `${keywords.length} keyword${keywords.length === 1 ? "" : "s"} → ${formatUsd(perKeywordCost * keywords.length)}`,
              "Live data — no cache, every check is fresh.",
            ]}
            disabled={running || keywords.length === 0 || !target.trim()}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeAiMode}
              onChange={(e) => setIncludeAiMode(e.target.checked)}
              disabled={running}
            />
            <span>
              Also check AI Mode{" "}
              <span className="text-xs text-slate-500">
                (+{formatUsd(COST_AI_MODE)} per keyword)
              </span>
            </span>
          </label>
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
              label="AIO domain cited"
              value={summary.mentioned.toLocaleString()}
              good={summary.mentioned > 0}
            />
            {(() => {
              // Round once so the displayed value and the colour band agree
              // — e.g. 29.6% must not display "30%" but colour amber.
              const rounded = Math.round(summary.rate);
              return (
                <Stat
                  label="AIO citation rate"
                  value={`${rounded}%`}
                  good={rounded >= 30}
                  warn={rounded > 0 && rounded < 30}
                />
              );
            })()}
          </div>

          {includeAiMode && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="With AI Mode"
                value={`${summary.withAiMode.toLocaleString()} / ${summary.done.toLocaleString()}`}
              />
              <Stat
                label="AI Mode domain cited"
                value={summary.mentionedAiMode.toLocaleString()}
                good={summary.mentionedAiMode > 0}
              />
              {(() => {
                const rounded = Math.round(summary.rateAiMode);
                return (
                  <Stat
                    label="AI Mode citation rate"
                    value={`${rounded}%`}
                    good={rounded >= 30}
                    warn={rounded > 0 && rounded < 30}
                  />
                );
              })()}
              <Stat label="" value="" />
            </div>
          )}

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
                  <th className="px-2 py-1 text-center">AIO cited</th>
                  <th className="px-2 py-1 text-right">Refs</th>
                  <th className="px-2 py-1 text-left">Reference domains</th>
                  {includeAiMode && (
                    <>
                      <th className="px-2 py-1 text-center">AI Mode</th>
                      <th className="px-2 py-1 text-center">AI Mode cited</th>
                      <th className="px-2 py-1 text-left">AI Mode domains</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t hover:bg-slate-50 ${
                      r.domain_mentioned === true || r.domain_in_ai_mode === true
                        ? "bg-emerald-50/40"
                        : ""
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
                    <td
                      className="max-w-md truncate px-2 py-1 font-mono text-[11px] text-slate-500"
                      title={r.reference_domains.join(", ")}
                    >
                      {r.reference_domains.slice(0, 4).join(", ")}
                      {r.reference_domains.length > 4 && ` +${r.reference_domains.length - 4}`}
                    </td>
                    {includeAiMode && (
                      <>
                        <td className="px-2 py-1 text-center">
                          {r.has_ai_mode === true ? (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] text-sky-800">
                              yes
                            </span>
                          ) : r.has_ai_mode === false ? (
                            <span className="text-slate-400">no</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {r.domain_in_ai_mode === true ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">
                              ✓
                            </span>
                          ) : r.domain_in_ai_mode === false ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td
                          className="max-w-md truncate px-2 py-1 font-mono text-[11px] text-slate-500"
                          title={r.ai_mode_domains.join(", ")}
                        >
                          {r.ai_mode_domains.slice(0, 4).join(", ")}
                          {r.ai_mode_domains.length > 4 &&
                            ` +${r.ai_mode_domains.length - 4}`}
                        </td>
                      </>
                    )}
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
