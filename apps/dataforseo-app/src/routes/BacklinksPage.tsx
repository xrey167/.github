import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import { formatCount, formatUsd } from "../lib/format";
import {
  tauriApi,
  type BacklinksDetailMode,
  type BacklinksDetailStatus,
  type BacklinksDetailView,
  type BacklinksSummaryView,
  type FilterTree,
} from "../lib/tauri";

type Tab = "summary" | "detail";

export default function BacklinksPage() {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Backlinks</h2>
        <p className="text-sm text-slate-600">
          Aggregate backlink profile for any domain — total links, referring
          domains, dofollow split, TLD distribution. The summary endpoint is
          cheap (one request, ~0.02 USD) and cached for 24 hours, so checking
          a domain you've looked at recently is free.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Reminder: DataForSEO's Backlinks family has a 100 USD/month minimum
          spend. The commitment can be used across all DataForSEO APIs but
          must be consumed monthly. Plan accordingly before activating.
        </p>
      </header>

      <nav className="flex gap-1 border-b text-sm">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </TabButton>
        <TabButton active={tab === "detail"} onClick={() => setTab("detail")}>
          Detail
        </TabButton>
      </nav>

      {tab === "summary" ? <SummaryTab /> : <DetailTab />}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 ${
        active
          ? "border-slate-800 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryTab() {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<BacklinksSummaryView | null>(null);
  const [useCache, setUseCache] = useState(true);

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksSummary({
        target: trimmed,
        useCache,
      });
      setSummary(result);
      const note = result.from_cache
        ? "from cache"
        : `${formatUsd(result.cost_usd)} fresh`;
      toast.success(`Loaded ${trimmed} (${note})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Target domain</span>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="example.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{
              kind: "Backlinks",
              target_count: 1,
              rows_per_target: 1,
            }}
            details={[
              "Single backlinks_summary request",
              useCache ? "Cache reused if last fetch <24h" : "Cache disabled",
            ]}
            disabled={busy || !target.trim()}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              disabled={busy}
            />
            Use 24h cache
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Load summary"}
          </button>
        </div>
      </div>

      {summary && <SummaryView view={summary} />}

      {!summary && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a domain above and click Load summary.
        </div>
      )}
    </div>
  );
}

function SummaryView({ view }: { view: BacklinksSummaryView }) {
  const s = view.summary as Record<string, unknown>;
  const num = (k: string) => {
    const v = s?.[k];
    return typeof v === "number" ? v : null;
  };

  const tiles = [
    { label: "Total backlinks", value: num("backlinks") },
    { label: "Referring domains", value: num("referring_domains") },
    { label: "Referring main domains", value: num("referring_main_domains") },
    { label: "Referring pages", value: num("referring_pages") },
    { label: "Dofollow", value: num("dofollow_backlinks") },
    { label: "Nofollow", value: num("nofollow_backlinks") },
    { label: "Broken backlinks", value: num("broken_backlinks") },
    { label: "Domain rank", value: num("rank") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.target}</strong>
        {view.from_cache && (
          <span className="rounded bg-slate-200 px-1 py-0.5">cache</span>
        )}
        {view.fetched_at && (
          <span>fetched {view.fetched_at.slice(0, 16)}</span>
        )}
        <span className="ml-auto">
          actual {formatUsd(view.cost_usd)} · estimated{" "}
          {formatUsd(view.estimated_usd)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded border bg-white p-3">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {t.value != null ? formatCount(t.value) : "—"}
            </div>
          </div>
        ))}
      </div>

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          Raw response (debug)
        </summary>
        <pre className="mt-2 overflow-x-auto text-[11px]">
          {JSON.stringify(view.summary, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ---------- Detail tab ----------

type FilterPreset = "all" | "dofollow" | "rank30" | "lost";

const PRESET_LABELS: Record<FilterPreset, string> = {
  all: "All backlinks",
  dofollow: "Dofollow only",
  rank30: "Domain rank > 30",
  lost: "Lost links",
};

// Each preset returns the (filter, statusOverride) pair. Status is forced to
// "lost" for the lost preset; the rest leave the user's status selection
// untouched. Filter is null for "all".
function buildPreset(
  preset: FilterPreset,
): { filter: FilterTree | null; statusOverride: BacklinksDetailStatus | null } {
  switch (preset) {
    case "all":
      return { filter: null, statusOverride: null };
    case "dofollow":
      return {
        filter: { kind: "condition", field: "dofollow", operator: "eq", value: true },
        statusOverride: null,
      };
    case "rank30":
      return {
        filter: { kind: "condition", field: "domain_from_rank", operator: "gt", value: 30 },
        statusOverride: null,
      };
    case "lost":
      // For "lost" we don't need a filter expression — DataForSEO has a
      // dedicated `backlinks_status_type=lost` query parameter.
      return { filter: null, statusOverride: "lost" };
  }
}

function DetailTab() {
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<BacklinksDetailMode>("as_is");
  const [status, setStatus] = useState<BacklinksDetailStatus>("live");
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksDetailView | null>(null);

  const effective = useMemo(() => buildPreset(preset), [preset]);
  const effectiveStatus = effective.statusOverride ?? status;

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksDetail({
        target: trimmed,
        mode,
        status: effectiveStatus,
        limit,
        offset: 0,
        includeSubdomains,
        filter: effective.filter,
        orderBy: ["domain_from_rank,desc"],
      });
      setView(result);
      toast.success(
        `Loaded ${formatCount(result.items_count)} of ${formatCount(result.total_count)} links (${formatUsd(result.cost_usd)})`,
      );
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Target domain</span>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={busy}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="example.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">Preset</span>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as FilterPreset)}
                disabled={busy}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              >
                {(Object.keys(PRESET_LABELS) as FilterPreset[]).map((p) => (
                  <option key={p} value={p}>
                    {PRESET_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as BacklinksDetailMode)}
                disabled={busy}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              >
                <option value="as_is">As-is (raw)</option>
                <option value="one_per_domain">One per domain</option>
                <option value="one_per_anchor">One per anchor</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">Status</span>
              <select
                value={effectiveStatus}
                onChange={(e) =>
                  setStatus(e.target.value as BacklinksDetailStatus)
                }
                disabled={busy || effective.statusOverride !== null}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              >
                <option value="live">Live</option>
                <option value="lost">Lost</option>
                <option value="all">All</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">Limit</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
                // Allow intermediate values during typing — clamping here
                // would jump 1→empty→0 to 1, blocking the user from
                // editing digit-by-digit. We finalise on blur instead.
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  setLimit(Number.isFinite(n) ? n : 0);
                }}
                onBlur={(e) => {
                  const n = e.target.valueAsNumber;
                  setLimit(
                    Number.isFinite(n) ? Math.max(1, Math.min(1000, n)) : 100,
                  );
                }}
                disabled={busy}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <CostPreview
            action={{
              kind: "Backlinks",
              target_count: 1,
              rows_per_target: limit,
            }}
            details={[
              `Up to ${formatCount(limit)} rows`,
              `Preset: ${PRESET_LABELS[preset]}`,
              `Status: ${effectiveStatus}`,
            ]}
            disabled={busy || !target.trim()}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSubdomains}
              onChange={(e) => setIncludeSubdomains(e.target.checked)}
              disabled={busy}
            />
            Include subdomains
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Load backlinks"}
          </button>
        </div>
      </div>

      {view && <DetailTable view={view} />}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Pick a domain and a preset, then load the per-link table.
        </div>
      )}
    </div>
  );
}

function DetailTable({ view }: { view: BacklinksDetailView }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.target}</strong>
        <span>
          {formatCount(view.items_count)} of {formatCount(view.total_count)} rows
        </span>
        <span className="ml-auto">
          actual {formatUsd(view.cost_usd)} · estimated{" "}
          {formatUsd(view.estimated_usd)}
        </span>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-left">Source</th>
              <th className="px-2 py-1 text-left">Anchor</th>
              <th className="px-2 py-1 text-left">Target</th>
              <th className="px-2 py-1 text-right">Rank</th>
              <th className="px-2 py-1 text-center">Type</th>
              <th className="px-2 py-1 text-center">Dofollow</th>
            </tr>
          </thead>
          <tbody>
            {view.items.map((row, i) => {
              const sourceUrl = str(row, "url_from");
              const anchor = str(row, "anchor");
              const targetUrl = str(row, "url_to");
              const rank = num(row, "domain_from_rank") ?? num(row, "rank");
              const itemType = str(row, "item_type");
              const dofollow = bool(row, "dofollow");
              return (
                <tr key={i} className="border-t hover:bg-slate-50">
                  <td className="max-w-xs truncate px-2 py-1 font-mono">
                    {sourceUrl ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-2 py-1">{anchor ?? "—"}</td>
                  <td className="max-w-xs truncate px-2 py-1 font-mono">
                    {targetUrl ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {rank != null ? rank : "—"}
                  </td>
                  <td className="px-2 py-1 text-center text-slate-500">
                    {itemType ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {dofollow == null ? "—" : dofollow ? "yes" : "no"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          Raw response (debug)
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto text-[11px]">
          {JSON.stringify(view.items, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function str(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}

function num(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bool(row: Record<string, unknown>, key: string): boolean | null {
  const v = row[key];
  return typeof v === "boolean" ? v : null;
}
