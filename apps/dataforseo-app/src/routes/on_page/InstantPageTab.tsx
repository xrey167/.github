import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CacheBadge from "../../components/CacheBadge";
import CostPreview from "../../components/CostPreview";
import { formatUsd } from "../../lib/format";
import { tauriApi, type OnPageInstantView } from "../../lib/tauri";

interface Props {
  url: string;
}

interface Audit {
  url: string | null;
  title: string | null;
  description: string | null;
  meta_keywords: string | null;
  status_code: number | null;
  size: number | null;
  encoded_size: number | null;
  total_dom_size: number | null;
  plain_text_size: number | null;
  plain_text_word_count: number | null;
  page_timing: Record<string, number> | null;
  checks: Record<string, boolean | number> | null;
  duplicate_meta_tags: Array<unknown> | null;
  broken_resources: boolean | null;
  is_https: boolean | null;
  redirect_chain: Array<unknown> | null;
}

function pickAudit(view: OnPageInstantView): Audit | null {
  const first = view.items?.[0];
  if (!first) return null;
  const meta = (first as Record<string, unknown>).meta as Record<string, unknown> | undefined;
  const content = (first as Record<string, unknown>).content as
    | Record<string, unknown>
    | undefined;
  const pageTiming = (first as Record<string, unknown>).page_timing as
    | Record<string, number>
    | undefined;
  const checks = (first as Record<string, unknown>).checks as
    | Record<string, boolean | number>
    | undefined;
  return {
    url: ((first as Record<string, unknown>).url as string) ?? null,
    title: (meta?.title as string | undefined) ?? null,
    description: (meta?.description as string | undefined) ?? null,
    meta_keywords: (meta?.keywords as string | undefined) ?? null,
    status_code: ((first as Record<string, unknown>).status_code as number | undefined) ?? null,
    size: ((first as Record<string, unknown>).size as number | undefined) ?? null,
    encoded_size: ((first as Record<string, unknown>).encoded_size as number | undefined) ?? null,
    total_dom_size:
      ((first as Record<string, unknown>).total_dom_size as number | undefined) ?? null,
    plain_text_size: (content?.plain_text_size as number | undefined) ?? null,
    plain_text_word_count: (content?.plain_text_word_count as number | undefined) ?? null,
    page_timing: pageTiming ?? null,
    checks: checks ?? null,
    duplicate_meta_tags:
      ((first as Record<string, unknown>).duplicate_meta_tags as Array<unknown> | undefined) ??
      null,
    broken_resources:
      (checks?.broken_resources as boolean | undefined) ?? null,
    is_https: ((first as Record<string, unknown>).is_https as boolean | undefined) ?? null,
    redirect_chain:
      ((first as Record<string, unknown>).redirect_chain as Array<unknown> | undefined) ?? null,
  };
}

export default function InstantPageTab({ url }: Props) {
  const [busy, setBusy] = useState(false);
  const [enableJs, setEnableJs] = useState(true);
  const [enableRender, setEnableRender] = useState(true);
  const [view, setView] = useState<OnPageInstantView | null>(null);

  const trimmed = url.trim();
  const audit = useMemo(() => (view ? pickAudit(view) : null), [view]);

  async function onRun(useCache: boolean) {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.onPageInstant({
        url: trimmed,
        enableJavascript: enableJs,
        enableBrowserRendering: enableRender,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? `Cached audit ($0.00)`
        : `Audit complete (${formatUsd(result.cost_usd)})`;
      toast.success(note);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Single-page SEO audit — meta tags, headings, content stats, page timing, and ~70 standard
        on-page checks. 0.0025 USD per page.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enableJs}
              onChange={(e) => setEnableJs(e.target.checked)}
              disabled={busy}
            />
            Enable JavaScript execution
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enableRender}
              onChange={(e) => setEnableRender(e.target.checked)}
              disabled={busy}
            />
            Enable headless browser rendering
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "OnPageInstantPages" }}
            details={["0.0025 USD per page", "Cached for 7 days"]}
            disabled={!trimmed || busy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || !trimmed}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Auditing…" : "Audit"}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || !trimmed}
              title="Bypass cache and refetch from DataForSEO"
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
            actual {formatUsd(view.cost_usd)} · estimated {formatUsd(view.estimated_usd)}
          </span>
        </div>
      )}

      {audit ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Meta">
            <Field label="Title" value={audit.title} />
            <Field label="Description" value={audit.description} />
            <Field label="Keywords" value={audit.meta_keywords} />
          </Card>
          <Card title="Response">
            <Field label="Status" value={audit.status_code} />
            <Field label="HTTPS" value={audit.is_https ? "yes" : audit.is_https === false ? "no" : null} />
            <Field
              label="Size"
              value={audit.size != null ? `${(audit.size / 1024).toFixed(1)} KB` : null}
            />
            <Field
              label="Encoded"
              value={
                audit.encoded_size != null ? `${(audit.encoded_size / 1024).toFixed(1)} KB` : null
              }
            />
            <Field label="DOM nodes" value={audit.total_dom_size} />
          </Card>
          <Card title="Content">
            <Field
              label="Word count"
              value={audit.plain_text_word_count?.toLocaleString() ?? null}
            />
            <Field
              label="Plain text"
              value={
                audit.plain_text_size != null
                  ? `${(audit.plain_text_size / 1024).toFixed(1)} KB`
                  : null
              }
            />
          </Card>
          <Card title="Page timing">
            {audit.page_timing ? (
              <ul className="space-y-1 text-xs">
                {Object.entries(audit.page_timing).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-mono tabular-nums">{Math.round(v)} ms</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No timing data</p>
            )}
          </Card>
          {audit.checks && (
            <Card title="Checks" className="lg:col-span-2">
              <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(audit.checks)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => {
                    const positive = v === false || v === 0;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            positive ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <span className="truncate" title={k}>
                          {k}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        !view &&
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Enter a URL above and click Audit.
          </div>
        )
      )}
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded border bg-white p-3 ${className ?? ""}`}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-mono tabular-nums" title={value != null ? String(value) : undefined}>
        {value != null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}
