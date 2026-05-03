import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import ExportMenu from "../../components/ExportMenu";
import { tauriApi, type AuditPage, type AuditRun } from "../../lib/tauri";

const PAGE_COLUMNS: ColumnDef<AuditPage, unknown>[] = [
  { id: "url", header: "URL", accessorKey: "url" },
  { id: "status_code", header: "HTTP", accessorKey: "status_code" },
  { id: "onpage_score", header: "Score", accessorKey: "onpage_score" },
  { id: "title", header: "Title", accessorKey: "title" },
  { id: "h1", header: "H1", accessorKey: "h1" },
  { id: "word_count", header: "Words", accessorKey: "plain_text_word_count" },
];

interface Props {
  run: AuditRun;
}

interface SummaryStats {
  pages_crawled: number;
  broken_pages: number;
  broken_resources: number;
  duplicate_titles: number;
  duplicate_descriptions: number;
  duplicate_content: number;
  non_indexable: number;
  redirect_loops: number;
  ssl_pages: number;
  links_internal: number;
  links_external: number;
}

function pickStats(summary: Record<string, unknown> | null): SummaryStats | null {
  if (!summary) return null;
  const c = (summary.checks as Record<string, number> | undefined) ?? {};
  const crawl = (summary.crawl_progress as Record<string, number> | undefined) ?? {};
  const links = (summary.links as Record<string, number> | undefined) ?? {};
  return {
    pages_crawled: (crawl.pages_crawled as number) ?? 0,
    broken_pages: (c.broken_links as number) ?? (c.is_broken as number) ?? 0,
    broken_resources: (c.broken_resources as number) ?? 0,
    duplicate_titles: (c.duplicate_title_tag as number) ?? 0,
    duplicate_descriptions: (c.duplicate_meta_description_tag as number) ?? 0,
    duplicate_content: (c.duplicate_content as number) ?? 0,
    non_indexable: (c.is_non_indexable as number) ?? 0,
    redirect_loops: (c.has_redirect_loop as number) ?? 0,
    ssl_pages: (c.is_https as number) ?? 0,
    links_internal: (links.internal as number) ?? 0,
    links_external: (links.external as number) ?? 0,
  };
}

const PAGE_LIMIT = 100;
const SUB_LIMIT = 100;

type TabId = "pages" | "broken" | "schema" | "links";

export default function AuditRunDetail({ run }: Props) {
  const [pages, setPages] = useState<AuditPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("pages");

  // Lift the lazy-loaded sub-endpoint state up here so flipping tabs
  // doesn't re-fetch every time the child unmounts.
  const [schemaItems, setSchemaItems] = useState<Array<Record<string, unknown>> | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [linksItems, setLinksItems] = useState<Array<Record<string, unknown>> | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tauriApi
      .auditPages({ id: run.id, limit: PAGE_LIMIT, offset: 0 })
      .then((p) => {
        if (!cancelled) setPages(p);
      })
      .catch((e) => {
        if (!cancelled) toast.error(formatError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [run.id]);

  // Reset cached lazy data when the run changes — different audit, different items.
  useEffect(() => {
    setSchemaItems(null);
    setLinksItems(null);
  }, [run.id]);

  // Lazy-fetch schema on first activation.
  useEffect(() => {
    if (tab !== "schema" || !run.task_id || schemaItems != null || schemaLoading) return;
    let cancelled = false;
    setSchemaLoading(true);
    tauriApi
      .onPageMicrodata({ taskId: run.task_id, limit: SUB_LIMIT, offset: 0, useCache: true })
      .then((view) => {
        if (!cancelled) setSchemaItems(view.items);
      })
      .catch((e) => {
        if (!cancelled) toast.error(formatError(e, "Schema"));
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, run.task_id, schemaItems, schemaLoading]);

  // Lazy-fetch internal links on first activation.
  useEffect(() => {
    if (tab !== "links" || !run.task_id || linksItems != null || linksLoading) return;
    let cancelled = false;
    setLinksLoading(true);
    tauriApi
      .onPageLinks({ taskId: run.task_id, limit: SUB_LIMIT, offset: 0, useCache: true })
      .then((view) => {
        if (!cancelled) setLinksItems(view.items);
      })
      .catch((e) => {
        if (!cancelled) toast.error(formatError(e, "Links"));
      })
      .finally(() => {
        if (!cancelled) setLinksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, run.task_id, linksItems, linksLoading]);

  const stats = useMemo(() => pickStats(run.summary), [run.summary]);

  // Broken-links derives from the same `pages` list — no extra API call.
  const brokenPages = useMemo(
    () => pages.filter((p) => (p.status_code ?? 200) >= 400 || (p.status_code ?? 200) === 0),
    [pages],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Audit · {run.target}</h3>
        <span className="text-xs text-slate-500">
          {run.completed_at ? `finished ${run.completed_at.slice(0, 16)}` : "in progress"}
        </span>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Pages crawled" value={stats.pages_crawled} />
          <Stat label="Broken pages" value={stats.broken_pages} bad={stats.broken_pages > 0} />
          <Stat
            label="Broken resources"
            value={stats.broken_resources}
            bad={stats.broken_resources > 0}
          />
          <Stat
            label="Duplicate titles"
            value={stats.duplicate_titles}
            warn={stats.duplicate_titles > 0}
          />
          <Stat
            label="Duplicate descriptions"
            value={stats.duplicate_descriptions}
            warn={stats.duplicate_descriptions > 0}
          />
          <Stat
            label="Duplicate content"
            value={stats.duplicate_content}
            warn={stats.duplicate_content > 0}
          />
          <Stat label="Non-indexable" value={stats.non_indexable} warn={stats.non_indexable > 0} />
          <Stat
            label="Redirect loops"
            value={stats.redirect_loops}
            bad={stats.redirect_loops > 0}
          />
          <Stat label="HTTPS pages" value={stats.ssl_pages} />
          <Stat label="Internal links" value={stats.links_internal} />
          <Stat label="External links" value={stats.links_external} />
        </div>
      )}

      {/* Tab strip */}
      <div className="flex gap-1 border-b">
        <TabButton id="pages" current={tab} onClick={setTab} label={`Pages (${pages.length})`} />
        <TabButton id="broken" current={tab} onClick={setTab} label={`Broken (${brokenPages.length})`} />
        <TabButton id="schema" current={tab} onClick={setTab} label="Schema" />
        <TabButton id="links" current={tab} onClick={setTab} label="Internal Links" />
      </div>

      {tab === "pages" && (
        <PagesTab pages={pages} loading={loading} runId={run.id} />
      )}
      {tab === "broken" && (
        <BrokenLinksTab pages={brokenPages} loading={loading} runId={run.id} />
      )}
      {tab === "schema" && run.task_id && (
        <SchemaTab items={schemaItems} loading={schemaLoading} runId={run.id} />
      )}
      {tab === "links" && run.task_id && (
        <InternalLinksTab items={linksItems} loading={linksLoading} runId={run.id} />
      )}
      {(tab === "schema" || tab === "links") && !run.task_id && (
        <p className="text-xs text-slate-500">
          No DataForSEO task id stored — this run pre-dates the lazy sub-endpoints feature.
        </p>
      )}
    </div>
  );
}

function TabButton({
  id,
  current,
  onClick,
  label,
}: {
  id: TabId;
  current: TabId;
  onClick: (id: TabId) => void;
  label: string;
}) {
  const active = current === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
        active
          ? "border-slate-800 font-medium text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function PagesTab({ pages, loading, runId }: { pages: AuditPage[]; loading: boolean; runId: number }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          Pages {pages.length > 0 && `(showing ${pages.length} weakest)`}
        </h4>
        {pages.length > 0 && (
          <ExportMenu
            filenameStem={`audit-${runId}-pages`}
            rows={pages}
            columns={PAGE_COLUMNS}
          />
        )}
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : pages.length === 0 ? (
        <p className="text-xs text-slate-500">No pages stored yet.</p>
      ) : (
        <PagesTable pages={pages} />
      )}
    </>
  );
}

function BrokenLinksTab({ pages, loading, runId }: { pages: AuditPage[]; loading: boolean; runId: number }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          Broken pages (HTTP ≥ 400 or 0)
        </h4>
        {pages.length > 0 && (
          <ExportMenu
            filenameStem={`audit-${runId}-broken`}
            rows={pages}
            columns={PAGE_COLUMNS}
          />
        )}
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : pages.length === 0 ? (
        <p className="rounded border bg-emerald-50 p-3 text-sm text-emerald-800">
          No broken pages in the crawled set. Nice.
        </p>
      ) : (
        <PagesTable pages={pages} />
      )}
    </>
  );
}

function PagesTable({ pages }: { pages: AuditPage[] }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-2 py-1 text-right">Score</th>
            <th className="px-2 py-1 text-right">HTTP</th>
            <th className="px-2 py-1 text-left">URL</th>
            <th className="px-2 py-1 text-left">Title</th>
            <th className="px-2 py-1 text-left">H1</th>
            <th className="px-2 py-1 text-right">Words</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id} className="border-t hover:bg-slate-50">
              <td
                className={`px-2 py-1 text-right tabular-nums ${
                  (p.onpage_score ?? 100) < 70
                    ? "font-semibold text-red-700"
                    : (p.onpage_score ?? 100) < 90
                      ? "text-amber-700"
                      : "text-slate-600"
                }`}
              >
                {p.onpage_score != null ? p.onpage_score.toFixed(0) : "—"}
              </td>
              <td
                className={`px-2 py-1 text-right tabular-nums ${
                  (p.status_code ?? 200) >= 400 || p.status_code === 0
                    ? "text-red-700"
                    : "text-slate-500"
                }`}
              >
                {p.status_code ?? "—"}
              </td>
              <td className="max-w-xs truncate px-2 py-1 font-mono" title={p.url}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {p.url}
                </a>
              </td>
              <td className="max-w-xs truncate px-2 py-1" title={p.title ?? ""}>
                {p.title ?? "—"}
              </td>
              <td className="max-w-xs truncate px-2 py-1" title={p.h1 ?? ""}>
                {p.h1 ?? "—"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums">
                {p.plain_text_word_count?.toLocaleString() ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Lazy sub-endpoint tabs — items are fetched once in AuditRunDetail and
// passed in here, so flipping tabs doesn't trigger redundant calls.

function SchemaTab({
  items,
  loading,
  runId,
}: {
  items: Array<Record<string, unknown>> | null;
  loading: boolean;
  runId: number;
}) {
  // Each item has { url, microdata, json_ld, og, twitter_cards } — flatten
  // into one row per detected schema type per page.
  const rows = useMemo(() => {
    if (!items) return [];
    const out: Array<{ url: string; format: string; type: string; status: string }> = [];
    for (const it of items) {
      const url = (it.url as string) ?? "—";
      const lists: Array<[string, unknown]> = [
        ["microdata", it.microdata],
        ["json-ld", it.json_ld],
        ["open-graph", it.og],
        ["twitter-card", it.twitter_cards],
      ];
      for (const [format, blob] of lists) {
        if (!blob) continue;
        if (Array.isArray(blob)) {
          if (blob.length === 0) continue;
          if (format === "open-graph" || format === "twitter-card") {
            // OG / Twitter use property/content pairs, not @type. Find the
            // canonical type-marker property and emit one row per page.
            const propName = format === "open-graph" ? "og:type" : "twitter:card";
            const typeEntry = blob.find(
              (e) => (e as Record<string, unknown>)?.property === propName,
            ) as Record<string, unknown> | undefined;
            const type = (typeEntry?.content as string) ?? "(present)";
            out.push({ url, format, type, status: "present" });
          } else {
            for (const entry of blob) {
              const type =
                ((entry as Record<string, unknown>)?.type as string) ??
                ((entry as Record<string, unknown>)?.["@type"] as string) ??
                "(unknown)";
              out.push({ url, format, type, status: "present" });
            }
          }
        } else if (typeof blob === "object") {
          out.push({ url, format, type: "(object)", status: "present" });
        }
      }
      // Missing means no format was present — count empty arrays as missing too.
      if (lists.every(([, b]) => !b || (Array.isArray(b) && b.length === 0))) {
        out.push({ url, format: "—", type: "(none)", status: "missing" });
      }
    }
    return out;
  }, [items]);

  const exportColumns = useMemo<ColumnDef<(typeof rows)[number], unknown>[]>(
    () => [
      { id: "url", header: "URL", accessorKey: "url" },
      { id: "format", header: "Format", accessorKey: "format" },
      { id: "type", header: "Type", accessorKey: "type" },
      { id: "status", header: "Status", accessorKey: "status" },
    ],
    [],
  );

  if (loading) return <p className="text-xs text-slate-500">Loading schema markup…</p>;
  if (rows.length === 0) {
    return (
      <p className="rounded border bg-amber-50 p-3 text-sm text-amber-800">
        No structured data items returned for this audit.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Schema markup ({rows.length} items)</h4>
        <ExportMenu
          filenameStem={`audit-${runId}-schema`}
          rows={rows}
          columns={exportColumns}
        />
      </div>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-left">URL</th>
              <th className="px-2 py-1 text-left">Format</th>
              <th className="px-2 py-1 text-left">Type</th>
              <th className="px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                <td className="max-w-xs truncate px-2 py-1 font-mono" title={r.url}>
                  {r.url}
                </td>
                <td className="px-2 py-1">{r.format}</td>
                <td className="px-2 py-1 font-mono">{r.type}</td>
                <td
                  className={`px-2 py-1 ${
                    r.status === "missing" ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InternalLinksTab({
  items,
  loading,
  runId,
}: {
  items: Array<Record<string, unknown>> | null;
  loading: boolean;
  runId: number;
}) {
  // Filter to internal links only — that's the SEO use case.
  const internal = useMemo(() => {
    if (!items) return [];
    return items.filter((it) => it.type === "internal");
  }, [items]);

  const exportColumns = useMemo<ColumnDef<Record<string, unknown>, unknown>[]>(
    () => [
      { id: "page_from", header: "From", accessorKey: "page_from" },
      { id: "page_to", header: "To", accessorKey: "page_to" },
      { id: "link_attribute", header: "Attr", accessorKey: "link_attribute" },
      { id: "dofollow", header: "Dofollow", accessorKey: "dofollow" },
      { id: "text", header: "Anchor", accessorKey: "text" },
    ],
    [],
  );

  if (loading) return <p className="text-xs text-slate-500">Loading internal links…</p>;
  if (internal.length === 0) {
    return (
      <p className="rounded border bg-amber-50 p-3 text-sm text-amber-800">
        No internal links returned. The audit may need a deeper crawl.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Internal links ({internal.length})</h4>
        <ExportMenu
          filenameStem={`audit-${runId}-internal-links`}
          rows={internal}
          columns={exportColumns}
        />
      </div>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-left">From</th>
              <th className="px-2 py-1 text-left">To</th>
              <th className="px-2 py-1 text-left">Anchor</th>
              <th className="px-2 py-1 text-left">Dofollow</th>
            </tr>
          </thead>
          <tbody>
            {internal.map((it, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                <td className="max-w-xs truncate px-2 py-1 font-mono" title={String(it.page_from ?? "")}>
                  {String(it.page_from ?? "—")}
                </td>
                <td className="max-w-xs truncate px-2 py-1 font-mono" title={String(it.page_to ?? "")}>
                  {String(it.page_to ?? "—")}
                </td>
                <td className="max-w-sm truncate px-2 py-1" title={String(it.text ?? "")}>
                  {String(it.text ?? "—")}
                </td>
                <td className="px-2 py-1">{it.dofollow === false ? "no" : "yes"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  bad,
  warn,
}: {
  label: string;
  value: number;
  bad?: boolean;
  warn?: boolean;
}) {
  const valueClass = bad
    ? "text-red-700"
    : warn
      ? "text-amber-700"
      : "text-slate-800";
  return (
    <div className="rounded border bg-white p-2">
      <div className={`text-lg font-semibold tabular-nums ${valueClass}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
