import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Trans, useTranslation } from "react-i18next";

import { formatError } from "../lib/errors";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CostPreview from "../components/CostPreview";
import FilterBuilder from "../components/FilterBuilder";
import { formatCount, formatUsd } from "../lib/format";
import {
  tauriApi,
  type BacklinksDetailMode,
  type BacklinksDetailStatus,
  type BacklinksDetailView,
  type BacklinksIntersectionMode,
  type BacklinksListView,
  type BacklinksSummaryView,
  type FilterTree,
} from "../lib/tauri";

type Tab =
  | "summary"
  | "detail"
  | "domains"
  | "anchors"
  | "history"
  | "linkgap"
  | "domainpages"
  | "pageintersect";

const TAB_KEYS: Record<Tab, string> = {
  summary: "backlinks.tabs.summary",
  detail: "backlinks.tabs.detail",
  domains: "backlinks.tabs.domains",
  anchors: "backlinks.tabs.anchors",
  history: "backlinks.tabs.history",
  linkgap: "backlinks.tabs.linkgap",
  domainpages: "backlinks.tabs.domainpages",
  pageintersect: "backlinks.tabs.pageintersect",
};

export default function BacklinksPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">{t("backlinks.title")}</h2>
        <p className="text-sm text-slate-600">{t("backlinks.description")}</p>
        <p className="mt-1 text-xs text-amber-700">{t("backlinks.minSpendNotice")}</p>
      </header>

      <nav className="flex gap-1 border-b text-sm">
        {(Object.keys(TAB_KEYS) as Tab[]).map((id) => (
          <TabButton key={id} active={tab === id} onClick={() => setTab(id)}>
            {t(TAB_KEYS[id])}
          </TabButton>
        ))}
      </nav>

      {tab === "summary" && <SummaryTab />}
      {tab === "detail" && <DetailTab />}
      {tab === "domains" && <ReferringDomainsTab />}
      {tab === "anchors" && <AnchorsTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "linkgap" && <LinkGapTab />}
      {tab === "domainpages" && <DomainPagesTab />}
      {tab === "pageintersect" && <PageIntersectionTab />}
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
  const { t } = useTranslation();
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
        ? t("backlinks.summary.fromCache")
        : t("backlinks.summary.fresh", { cost: formatUsd(result.cost_usd) });
      toast.success(t("backlinks.summary.loaded", { target: trimmed, note }));
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("backlinks.common.targetDomain")}</span>
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
              t("backlinks.summary.singleRequest"),
              useCache
                ? t("backlinks.summary.cacheReused")
                : t("backlinks.summary.cacheDisabled"),
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
            {t("backlinks.summary.useCache")}
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("backlinks.common.loading") : t("backlinks.summary.loadButton")}
          </button>
        </div>
      </div>

      {summary && <SummaryView view={summary} />}

      {!summary && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          {t("backlinks.summary.empty")}
        </div>
      )}
    </div>
  );
}

function SummaryView({ view }: { view: BacklinksSummaryView }) {
  const { t } = useTranslation();
  const s = view.summary as Record<string, unknown>;
  const numAt = (k: string) => {
    const v = s?.[k];
    return typeof v === "number" ? v : null;
  };

  const tiles = [
    { label: t("backlinks.summary.tiles.totalBacklinks"), value: numAt("backlinks") },
    { label: t("backlinks.summary.tiles.referringDomains"), value: numAt("referring_domains") },
    { label: t("backlinks.summary.tiles.referringMainDomains"), value: numAt("referring_main_domains") },
    { label: t("backlinks.summary.tiles.referringPages"), value: numAt("referring_pages") },
    { label: t("backlinks.summary.tiles.dofollow"), value: numAt("dofollow_backlinks") },
    { label: t("backlinks.summary.tiles.nofollow"), value: numAt("nofollow_backlinks") },
    { label: t("backlinks.summary.tiles.brokenBacklinks"), value: numAt("broken_backlinks") },
    { label: t("backlinks.summary.tiles.domainRank"), value: numAt("rank") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.target}</strong>
        {view.from_cache && (
          <span className="rounded bg-slate-200 px-1 py-0.5">{t("backlinks.common.cache")}</span>
        )}
        {view.fetched_at && (
          <span>{t("backlinks.common.fetchedAt", { time: view.fetched_at.slice(0, 16) })}</span>
        )}
        <span className="ml-auto">
          {t("backlinks.common.actualEstimated", {
            actual: formatUsd(view.cost_usd),
            estimated: formatUsd(view.estimated_usd),
          })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded border bg-white p-3">
            <div className="text-xs text-slate-500">{tile.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {tile.value != null ? formatCount(tile.value) : "—"}
            </div>
          </div>
        ))}
      </div>

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          {t("backlinks.common.rawDebug")}
        </summary>
        <pre className="mt-2 overflow-x-auto text-[11px]">
          {JSON.stringify(view.summary, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ---------- Detail tab ----------

type FilterPreset = "dofollow" | "rank30" | "lost";

const PRESET_KEYS: Record<FilterPreset, string> = {
  dofollow: "backlinks.detail.presets.dofollow",
  rank30: "backlinks.detail.presets.rank30",
  lost: "backlinks.detail.presets.lost",
};

function applyPreset(
  preset: FilterPreset,
): { filter: FilterTree | null; status: BacklinksDetailStatus | null } {
  switch (preset) {
    case "dofollow":
      return {
        filter: { kind: "condition", field: "dofollow", operator: "eq", value: true },
        status: null,
      };
    case "rank30":
      return {
        filter: { kind: "condition", field: "domain_from_rank", operator: "gt", value: 30 },
        status: null,
      };
    case "lost":
      return { filter: null, status: "lost" };
  }
}

function DetailTab() {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<BacklinksDetailMode>("as_is");
  const [status, setStatus] = useState<BacklinksDetailStatus>("live");
  const [filter, setFilter] = useState<FilterTree | null>(null);
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksDetailView | null>(null);

  function loadPreset(preset: FilterPreset) {
    const p = applyPreset(preset);
    setFilter(p.filter);
    if (p.status != null) setStatus(p.status);
  }

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksDetail({
        target: trimmed,
        mode,
        status,
        limit,
        offset: 0,
        includeSubdomains,
        filter,
        orderBy: ["domain_from_rank,desc"],
      });
      setView(result);
      toast.success(
        t("backlinks.detail.loaded", {
          count: formatCount(result.items_count),
          total: formatCount(result.total_count),
          cost: formatUsd(result.cost_usd),
        }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const conditionCount = filter == null ? 0 : filterCount(filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              {t("backlinks.common.targetDomain")}
            </span>
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
              <span className="font-medium text-slate-700">{t("backlinks.common.mode")}</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as BacklinksDetailMode)}
                disabled={busy}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              >
                <option value="as_is">{t("backlinks.detail.modeOptions.asIs")}</option>
                <option value="one_per_domain">
                  {t("backlinks.detail.modeOptions.onePerDomain")}
                </option>
                <option value="one_per_anchor">
                  {t("backlinks.detail.modeOptions.onePerAnchor")}
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">{t("backlinks.common.status")}</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BacklinksDetailStatus)}
                disabled={busy}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              >
                <option value="live">{t("backlinks.detail.statusOptions.live")}</option>
                <option value="lost">{t("backlinks.detail.statusOptions.lost")}</option>
                <option value="all">{t("backlinks.detail.statusOptions.all")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">{t("backlinks.common.limit")}</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
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

          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 text-slate-500">{t("backlinks.detail.presetsLabel")}</span>
            {(Object.keys(PRESET_KEYS) as FilterPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => loadPreset(p)}
                disabled={busy}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {t(PRESET_KEYS[p])}
              </button>
            ))}
          </div>

          <FilterBuilder value={filter} onChange={setFilter} disabled={busy} />
        </div>

        <div className="flex flex-col gap-3">
          <CostPreview
            action={{
              kind: "Backlinks",
              target_count: 1,
              rows_per_target: limit,
            }}
            details={[
              t("backlinks.detail.upToRows", { count: formatCount(limit) }),
              t("backlinks.detail.statusLabel", { status }),
              filter == null
                ? t("backlinks.detail.noFilter")
                : t("backlinks.detail.filterCount", { count: conditionCount }),
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
            {t("backlinks.common.includeSubdomains")}
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("backlinks.common.loading") : t("backlinks.detail.loadButton")}
          </button>
        </div>
      </div>

      {view && <DetailTable view={view} />}

      {!view && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          {t("backlinks.detail.empty")}
        </div>
      )}
    </div>
  );
}

/// Count leaf conditions in a filter tree, for the cost-preview hint.
function filterCount(tree: FilterTree): number {
  if (tree.kind === "condition") return 1;
  return tree.nodes.reduce((sum, n) => sum + filterCount(n), 0);
}

function DetailTable({ view }: { view: BacklinksDetailView }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.target}</strong>
        <span>
          {t("backlinks.common.rowsOf", {
            count: formatCount(view.items_count),
            total: formatCount(view.total_count),
          })}
        </span>
        <span className="ml-auto">
          {t("backlinks.common.actualEstimated", {
            actual: formatUsd(view.cost_usd),
            estimated: formatUsd(view.estimated_usd),
          })}
        </span>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-left">{t("backlinks.detail.columns.source")}</th>
              <th className="px-2 py-1 text-left">{t("backlinks.detail.columns.anchor")}</th>
              <th className="px-2 py-1 text-left">{t("backlinks.detail.columns.target")}</th>
              <th className="px-2 py-1 text-right">{t("backlinks.detail.columns.rank")}</th>
              <th className="px-2 py-1 text-center">{t("backlinks.detail.columns.type")}</th>
              <th className="px-2 py-1 text-center">{t("backlinks.detail.columns.dofollow")}</th>
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
                  <td className="max-w-xs truncate px-2 py-1 font-mono">{sourceUrl ?? "—"}</td>
                  <td className="max-w-xs truncate px-2 py-1">{anchor ?? "—"}</td>
                  <td className="max-w-xs truncate px-2 py-1 font-mono">{targetUrl ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {rank != null ? rank : "—"}
                  </td>
                  <td className="px-2 py-1 text-center text-slate-500">{itemType ?? "—"}</td>
                  <td className="px-2 py-1 text-center">
                    {dofollow == null
                      ? "—"
                      : dofollow
                        ? t("backlinks.common.yes")
                        : t("backlinks.common.no")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          {t("backlinks.common.rawDebug")}
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

// ---------- Referring Domains tab ----------

function ReferringDomainsTab() {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksListView | null>(null);

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksReferringDomains({
        target: trimmed,
        limit,
        offset: 0,
        includeSubdomains,
        filter: null,
        orderBy: ["rank,desc"],
      });
      setView(result);
      toast.success(
        t("backlinks.domains.loaded", {
          count: formatCount(result.items_count),
          total: formatCount(result.total_count),
          cost: formatUsd(result.cost_usd),
        }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ListInputs
        target={target}
        setTarget={setTarget}
        limit={limit}
        setLimit={setLimit}
        includeSubdomains={includeSubdomains}
        setIncludeSubdomains={setIncludeSubdomains}
        busy={busy}
        onRun={onRun}
        runLabel={t("backlinks.domains.loadButton")}
        details={[
          t("backlinks.domains.upToDomains", { count: formatCount(limit) }),
          t("backlinks.domains.sortedByRank"),
        ]}
      />
      {view ? (
        <ListTable
          view={view}
          columns={[
            { key: "domain", label: t("backlinks.domains.columns.domain"), kind: "string" },
            {
              key: "rank",
              label: t("backlinks.domains.columns.rank"),
              kind: "number",
              align: "right",
            },
            {
              key: "backlinks",
              label: t("backlinks.domains.columns.links"),
              kind: "number",
              align: "right",
            },
            {
              key: "first_seen",
              label: t("backlinks.domains.columns.firstSeen"),
              kind: "string",
              transform: (v) => (typeof v === "string" ? v.slice(0, 10) : "—"),
            },
            {
              key: "lost_date",
              label: t("backlinks.domains.columns.lost"),
              kind: "string",
              transform: (v) => (typeof v === "string" ? v.slice(0, 10) : "—"),
            },
          ]}
        />
      ) : (
        !busy && <EmptyHint label={t("backlinks.domains.empty")} />
      )}
    </div>
  );
}

// ---------- Anchors tab ----------

function AnchorsTab() {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksListView | null>(null);

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksAnchors({
        target: trimmed,
        limit,
        offset: 0,
        includeSubdomains,
        filter: null,
        orderBy: ["backlinks,desc"],
      });
      setView(result);
      toast.success(
        t("backlinks.anchors.loaded", {
          count: formatCount(result.items_count),
          total: formatCount(result.total_count),
          cost: formatUsd(result.cost_usd),
        }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ListInputs
        target={target}
        setTarget={setTarget}
        limit={limit}
        setLimit={setLimit}
        includeSubdomains={includeSubdomains}
        setIncludeSubdomains={setIncludeSubdomains}
        busy={busy}
        onRun={onRun}
        runLabel={t("backlinks.anchors.loadButton")}
        details={[
          t("backlinks.anchors.upToAnchors", { count: formatCount(limit) }),
          t("backlinks.anchors.sortedByLinks"),
        ]}
      />
      {view ? (
        <ListTable
          view={view}
          columns={[
            { key: "anchor", label: t("backlinks.anchors.columns.anchor"), kind: "string" },
            {
              key: "backlinks",
              label: t("backlinks.anchors.columns.backlinks"),
              kind: "number",
              align: "right",
            },
            {
              key: "referring_domains",
              label: t("backlinks.anchors.columns.domains"),
              kind: "number",
              align: "right",
            },
            {
              key: "dofollow_backlinks",
              label: t("backlinks.anchors.columns.dofollow"),
              kind: "number",
              align: "right",
            },
          ]}
        />
      ) : (
        !busy && <EmptyHint label={t("backlinks.anchors.empty")} />
      )}
    </div>
  );
}

// ---------- History tab ----------

function HistoryTab() {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksListView | null>(null);

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksHistory({
        target: trimmed,
        dateFrom: null,
        dateTo: null,
      });
      setView(result);
      toast.success(
        t("backlinks.history.loaded", {
          count: formatCount(result.items_count),
          cost: formatUsd(result.cost_usd),
        }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const chartData = useMemo(() => {
    if (!view) return [];
    return view.items
      .map((row) => ({
        date: str(row, "date") ?? "",
        backlinks: num(row, "backlinks") ?? 0,
        referringDomains: num(row, "referring_domains") ?? 0,
      }))
      .filter((p) => p.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [view]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("backlinks.common.targetDomain")}</span>
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
              t("backlinks.history.monthlySnapshots"),
              t("backlinks.history.fiveYears"),
              t("backlinks.history.flatFee"),
            ]}
            disabled={busy || !target.trim()}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !target.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("backlinks.common.loading") : t("backlinks.history.loadButton")}
          </button>
        </div>
      </div>

      {view && chartData.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <strong className="font-mono text-slate-700">{view.target}</strong>
            <span>{t("backlinks.history.snapshots", { count: view.items_count })}</span>
            <span className="ml-auto">
              {t("backlinks.common.actualEstimated", {
                actual: formatUsd(view.cost_usd),
                estimated: formatUsd(view.estimated_usd),
              })}
            </span>
          </div>
          <div className="h-72 rounded border bg-white p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCount(v as number)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCount(v as number)}
                />
                <Tooltip formatter={(value, name) => [formatCount(value as number), name]} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="backlinks"
                  name={t("backlinks.history.lines.backlinks")}
                  stroke="#1e293b"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="referringDomains"
                  name={t("backlinks.history.lines.referringDomains")}
                  stroke="#0ea5e9"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!view && !busy && <EmptyHint label={t("backlinks.history.empty")} />}
    </div>
  );
}

// ---------- Shared list helpers ----------

function ListInputs(props: {
  target: string;
  setTarget: (v: string) => void;
  limit: number;
  setLimit: (v: number) => void;
  includeSubdomains: boolean;
  setIncludeSubdomains: (v: boolean) => void;
  busy: boolean;
  onRun: () => void;
  runLabel: string;
  details: string[];
}) {
  const { t } = useTranslation();
  const {
    target,
    setTarget,
    limit,
    setLimit,
    includeSubdomains,
    setIncludeSubdomains,
    busy,
    onRun,
    runLabel,
    details,
  } = props;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("backlinks.common.targetDomain")}</span>
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("backlinks.common.limit")}</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              setLimit(Number.isFinite(n) ? n : 0);
            }}
            onBlur={(e) => {
              const n = e.target.valueAsNumber;
              setLimit(Number.isFinite(n) ? Math.max(1, Math.min(1000, n)) : 100);
            }}
            disabled={busy}
            className="rounded border px-2 py-1 disabled:bg-slate-50"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <CostPreview
          action={{
            kind: "Backlinks",
            target_count: 1,
            rows_per_target: limit,
          }}
          details={details}
          disabled={busy || !target.trim()}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeSubdomains}
            onChange={(e) => setIncludeSubdomains(e.target.checked)}
            disabled={busy}
          />
          {t("backlinks.common.includeSubdomains")}
        </label>
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !target.trim()}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? t("backlinks.common.loading") : runLabel}
        </button>
      </div>
    </div>
  );
}

interface ListColumn {
  key: string;
  label: string;
  kind: "string" | "number";
  align?: "left" | "right";
  transform?: (v: unknown) => string;
}

function ListTable({
  view,
  columns,
}: {
  view: BacklinksListView;
  columns: ListColumn[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.target}</strong>
        <span>
          {t("backlinks.common.rowsOf", {
            count: formatCount(view.items_count),
            total: formatCount(view.total_count),
          })}
        </span>
        <span className="ml-auto">
          {t("backlinks.common.actualEstimated", {
            actual: formatUsd(view.cost_usd),
            estimated: formatUsd(view.estimated_usd),
          })}
        </span>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-1 ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.items.map((row, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                {columns.map((col) => {
                  const raw = row[col.key];
                  let cell: string;
                  if (col.transform) {
                    cell = col.transform(raw);
                  } else if (col.kind === "number") {
                    const n = num(row, col.key);
                    cell = n != null ? formatCount(n) : "—";
                  } else {
                    cell = str(row, col.key) ?? "—";
                  }
                  return (
                    <td
                      key={col.key}
                      className={`max-w-xs truncate px-2 py-1 ${
                        col.align === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">{label}</div>
  );
}

// ---------- Link Gap (Domain Intersection) tab ----------

function LinkGapTab() {
  const { t } = useTranslation();
  const [targetA, setTargetA] = useState("");
  const [targetB, setTargetB] = useState("");
  const [mode, setMode] = useState<BacklinksIntersectionMode>("exclude");
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksListView | null>(null);

  async function onRun() {
    const a = targetA.trim();
    const b = targetB.trim();
    if (!a || !b) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksDomainIntersection({
        targetA: mode === "exclude" ? b : a,
        targetB: mode === "exclude" ? a : b,
        intersectionMode: mode,
        limit,
        offset: 0,
        includeSubdomains,
        filter: null,
        orderBy: ["rank,desc"],
      });
      setView(result);
      toast.success(
        mode === "intersect"
          ? t("backlinks.linkgap.loadedIntersect", {
              count: formatCount(result.items_count),
              cost: formatUsd(result.cost_usd),
            })
          : t("backlinks.linkgap.loadedExclude", {
              count: formatCount(result.items_count),
              targetA: a,
              targetB: b,
              cost: formatUsd(result.cost_usd),
            }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-slate-600">
        <Trans
          i18nKey="backlinks.linkgap.description"
          values={{ targetA: targetA || "A", targetB: targetB || "B" }}
          components={{ 1: <strong />, 2: <strong /> }}
        />
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t("backlinks.linkgap.yourDomain")}</span>
            <input
              type="text"
              value={targetA}
              onChange={(e) => setTargetA(e.target.value)}
              disabled={busy}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="example.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              {t("backlinks.linkgap.competitorDomain")}
            </span>
            <input
              type="text"
              value={targetB}
              onChange={(e) => setTargetB(e.target.value)}
              disabled={busy}
              className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
              placeholder="competitor.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">{t("backlinks.common.mode")}</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as BacklinksIntersectionMode)}
                disabled={busy}
                className="rounded border px-2 py-1 disabled:bg-slate-50"
              >
                <option value="exclude">{t("backlinks.linkgap.modeOptions.exclude")}</option>
                <option value="intersect">
                  {t("backlinks.linkgap.modeOptions.intersect")}
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">{t("backlinks.common.limit")}</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  setLimit(Number.isFinite(n) ? n : 0);
                }}
                onBlur={(e) => {
                  const n = e.target.valueAsNumber;
                  setLimit(Number.isFinite(n) ? Math.max(1, Math.min(1000, n)) : 100);
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
              t("backlinks.linkgap.upToDomains", { count: formatCount(limit) }),
              mode === "exclude"
                ? t("backlinks.linkgap.modeHints.exclude")
                : t("backlinks.linkgap.modeHints.intersect"),
            ]}
            disabled={busy || !targetA.trim() || !targetB.trim()}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSubdomains}
              onChange={(e) => setIncludeSubdomains(e.target.checked)}
              disabled={busy}
            />
            {t("backlinks.common.includeSubdomains")}
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !targetA.trim() || !targetB.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("backlinks.common.loading") : t("backlinks.linkgap.loadButton")}
          </button>
        </div>
      </div>

      {view ? (
        <ListTable
          view={view}
          columns={[
            { key: "domain", label: t("backlinks.domains.columns.domain"), kind: "string" },
            {
              key: "rank",
              label: t("backlinks.domains.columns.rank"),
              kind: "number",
              align: "right",
            },
            {
              key: "backlinks",
              label: t("backlinks.domains.columns.links"),
              kind: "number",
              align: "right",
            },
            {
              key: "first_seen",
              label: t("backlinks.domains.columns.firstSeen"),
              kind: "string",
              transform: (v) => (typeof v === "string" ? v.slice(0, 10) : "—"),
            },
          ]}
        />
      ) : (
        !busy && <EmptyHint label={t("backlinks.linkgap.empty")} />
      )}
    </div>
  );
}

// ---------- Domain Pages tab ----------

function DomainPagesTab() {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksListView | null>(null);

  async function onRun() {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksDomainPages({
        target: trimmed,
        limit,
        offset: 0,
        includeSubdomains,
        filter: null,
        // Order by inbound rank so the most-linked pages on the domain
        // float to the top — useful for finding link magnets to copy
        // or fix.
        orderBy: ["rank,desc"],
      });
      setView(result);
      toast.success(
        t("backlinks.domainpages.loaded", {
          count: formatCount(result.items_count),
          total: formatCount(result.total_count),
          cost: formatUsd(result.cost_usd),
        }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ListInputs
        target={target}
        setTarget={setTarget}
        limit={limit}
        setLimit={setLimit}
        includeSubdomains={includeSubdomains}
        setIncludeSubdomains={setIncludeSubdomains}
        busy={busy}
        onRun={onRun}
        runLabel={t("backlinks.domainpages.loadButton")}
        details={[
          t("backlinks.domainpages.upToPages", { count: formatCount(limit) }),
          t("backlinks.domainpages.sortedByRank"),
        ]}
      />
      {view ? (
        <ListTable
          view={view}
          columns={[
            { key: "url", label: t("backlinks.domainpages.columns.url"), kind: "string" },
            {
              key: "rank",
              label: t("backlinks.domainpages.columns.rank"),
              kind: "number",
              align: "right",
            },
            {
              key: "backlinks",
              label: t("backlinks.domainpages.columns.links"),
              kind: "number",
              align: "right",
            },
            {
              key: "referring_domains",
              label: t("backlinks.domainpages.columns.refDomains"),
              kind: "number",
              align: "right",
            },
            {
              key: "first_seen",
              label: t("backlinks.domainpages.columns.firstSeen"),
              kind: "string",
              transform: (v) => (typeof v === "string" ? v.slice(0, 10) : "—"),
            },
          ]}
        />
      ) : (
        !busy && <EmptyHint label={t("backlinks.domainpages.empty")} />
      )}
    </div>
  );
}

// ---------- Page Intersection tab ----------

function PageIntersectionTab() {
  const { t } = useTranslation();
  const [pagesText, setPagesText] = useState("");
  const [intersections, setIntersections] = useState(2);
  const [limit, setLimit] = useState(100);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BacklinksListView | null>(null);

  const pages = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const line of pagesText.split(/\r?\n/)) {
      const p = line.trim();
      if (p && !seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
    return out.slice(0, 20);
  }, [pagesText]);

  // Auto-clamp `intersections` so the user can't request more than they
  // entered (the API would reject it). Same pattern as the limit clamp
  // in DetailTab.
  const effectiveIntersections = Math.min(
    Math.max(1, intersections),
    Math.max(1, pages.length),
  );

  async function onRun() {
    if (pages.length < 2) return;
    setBusy(true);
    try {
      const result = await tauriApi.backlinksPageIntersection({
        pages,
        intersections: effectiveIntersections,
        limit,
        offset: 0,
        includeSubdomains,
        filter: null,
        orderBy: ["rank,desc"],
      });
      setView(result);
      toast.success(
        t("backlinks.pageintersect.loaded", {
          count: formatCount(result.items_count),
          total: formatCount(result.total_count),
          cost: formatUsd(result.cost_usd),
        }),
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">{t("backlinks.pageintersect.description")}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            {t("backlinks.pageintersect.pagesLabel", { count: pages.length })}
          </span>
          <textarea
            value={pagesText}
            onChange={(e) => setPagesText(e.target.value)}
            disabled={busy}
            className="h-40 rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder={"https://competitor-a.com/article\nhttps://competitor-b.com/article"}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">
              {t("backlinks.pageintersect.minPagesLabel", { count: effectiveIntersections })}
            </span>
            <input
              type="range"
              min={1}
              max={Math.max(1, pages.length)}
              step={1}
              value={effectiveIntersections}
              onChange={(e) => setIntersections(parseInt(e.target.value, 10))}
              disabled={busy || pages.length < 2}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-600">
              {t("backlinks.pageintersect.limitLabel", { count: limit })}
            </span>
            <input
              type="number"
              min={10}
              max={1000}
              step={10}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10) || 100)}
              disabled={busy}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={includeSubdomains}
              onChange={(e) => setIncludeSubdomains(e.target.checked)}
              disabled={busy}
            />
            {t("backlinks.common.includeSubdomains")}
          </label>
          <CostPreview
            action={{ kind: "Backlinks", target_count: 1, rows_per_target: limit }}
            details={[
              t("backlinks.pageintersect.intersectSummary", {
                pages: pages.length,
                min: effectiveIntersections,
              }),
              t("backlinks.pageintersect.upToDomains", { count: formatCount(limit) }),
            ]}
            disabled={busy || pages.length < 2}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || pages.length < 2}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("backlinks.common.loading") : t("backlinks.pageintersect.loadButton")}
          </button>
        </div>
      </div>

      {view ? (
        <ListTable
          view={view}
          columns={[
            {
              key: "domain",
              label: t("backlinks.pageintersect.columns.domain"),
              kind: "string",
            },
            {
              key: "rank",
              label: t("backlinks.pageintersect.columns.rank"),
              kind: "number",
              align: "right",
            },
            {
              key: "backlinks",
              label: t("backlinks.pageintersect.columns.links"),
              kind: "number",
              align: "right",
            },
            {
              key: "referring_pages",
              label: t("backlinks.pageintersect.columns.refPages"),
              kind: "number",
              align: "right",
            },
          ]}
        />
      ) : (
        !busy &&
        pages.length < 2 && <EmptyHint label={t("backlinks.pageintersect.empty")} />
      )}
    </div>
  );
}
