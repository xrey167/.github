import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import { tauriApi, type AuditPage, type AuditRun } from "../../lib/tauri";

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

export default function AuditRunDetail({ run }: Props) {
  const [pages, setPages] = useState<AuditPage[]>([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => pickStats(run.summary), [run.summary]);

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

      <h4 className="mt-2 text-sm font-semibold">
        Pages {pages.length > 0 && `(showing ${pages.length} weakest)`}
      </h4>
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : pages.length === 0 ? (
        <p className="text-xs text-slate-500">No pages stored yet.</p>
      ) : (
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
                      (p.status_code ?? 200) >= 400 ? "text-red-700" : "text-slate-500"
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
      )}
    </div>
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
