import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { formatError } from "../../lib/errors";

import CacheBadge from "../../components/CacheBadge";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type BulkVolumeItem, type BulkVolumeView } from "../../lib/tauri";

const MAX_KEYWORDS = 1000;

type VolumeSource = "labs" | "clickstream";

/// Bulk per-keyword volume with a Labs (0.0001/kw, Google-Ads-derived) /
/// Clickstream (0.0006/kw, panel-derived) source toggle. Labs is the
/// default — ~750× cheaper than Google Ads at bulk and good enough for
/// head terms. Clickstream is more accurate on long-tail at 6× the
/// per-kw cost. Both responses share the same view shape so the table
/// renders identically; clickstream rows have null competition / CPC
/// because the panel source doesn't carry ad-auction signals.
export default function BulkVolumeTab() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<VolumeSource>("labs");
  const [view, setView] = useState<BulkVolumeView | null>(null);

  const keywords = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const k = line.trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out.slice(0, MAX_KEYWORDS);
  }, [text]);

  async function onRun(useCache: boolean) {
    if (keywords.length === 0) return;
    setBusy(true);
    try {
      const call =
        source === "clickstream"
          ? tauriApi.clickstreamBulkSearchVolume
          : tauriApi.labsBulkSearchVolume;
      const result = await call({
        keywords,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache,
      });
      setView(result);
      const note = result.from_cache
        ? t("keywords.bulkVolume.loadedCached", { count: result.items.length })
        : t("keywords.bulkVolume.loaded", {
            count: result.items.length,
            cost: formatUsd(result.cost_usd),
          });
      toast.success(note);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const sorted = useMemo(
    () =>
      view
        ? [...view.items].sort(
            (a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0),
          )
        : [],
    [view],
  );

  const exportColumns = useMemo<ColumnDef<BulkVolumeItem, unknown>[]>(
    () => [
      { id: "keyword", header: t("keywords.common.keyword"), accessorKey: "keyword" },
      { id: "search_volume", header: t("keywords.common.volume"), accessorKey: "search_volume" },
      { id: "competition", header: t("keywords.common.competition"), accessorKey: "competition" },
      { id: "competition_level", header: t("keywords.common.level"), accessorKey: "competition_level" },
      { id: "cpc", header: t("keywords.common.cpc"), accessorKey: "cpc" },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        {t("keywords.bulkVolume.description", { max: MAX_KEYWORDS })}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            {t("keywords.bulkVolume.keywordsLabel", {
              count: keywords.length,
              max: MAX_KEYWORDS,
            })}
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            className="h-48 rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo tools&#10;keyword research&#10;backlink checker"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-1 text-xs">
            <legend className="font-medium text-slate-700">
              {t("keywords.bulkVolume.sourceLabel")}
            </legend>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="bulk-volume-source"
                  value="labs"
                  checked={source === "labs"}
                  onChange={() => setSource("labs")}
                  disabled={busy}
                />
                <span>{t("keywords.bulkVolume.sourceLabs")}</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="bulk-volume-source"
                  value="clickstream"
                  checked={source === "clickstream"}
                  onChange={() => setSource("clickstream")}
                  disabled={busy}
                />
                <span>{t("keywords.bulkVolume.sourceClickstream")}</span>
              </label>
            </div>
          </fieldset>
          <CostPreview
            action={
              source === "clickstream"
                ? { kind: "ClickstreamBulkSearchVolume", count: keywords.length }
                : { kind: "LabsBulkSearchVolume", count: keywords.length }
            }
            details={[
              t("keywords.bulkVolume.keywordsLabel", {
                count: keywords.length,
                max: MAX_KEYWORDS,
              }),
              source === "clickstream"
                ? t("keywords.bulkVolume.perKeywordClickstream")
                : t("keywords.bulkVolume.perKeyword"),
              t("keywords.bulkVolume.cached30d"),
            ]}
            disabled={busy || keywords.length === 0}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRun(true)}
              disabled={busy || keywords.length === 0}
              className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? t("keywords.common.loading") : t("keywords.common.lookup")}
            </button>
            <button
              type="button"
              onClick={() => onRun(false)}
              disabled={busy || keywords.length === 0}
              title={t("keywords.common.bypassCache")}
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
            {t("keywords.common.rowsActualEstimated", {
              count: view.items.length,
              actual: formatUsd(view.cost_usd),
              estimated: formatUsd(view.estimated_usd),
            })}
          </span>
          <span className="ml-auto">
            <ExportMenu filenameStem="bulk-volume" rows={sorted} columns={exportColumns} />
          </span>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-1 text-left">{t("keywords.common.keyword")}</th>
                <th className="px-2 py-1 text-right">{t("keywords.common.volume")}</th>
                <th className="px-2 py-1 text-right">{t("keywords.common.competition")}</th>
                <th className="px-2 py-1 text-left">{t("keywords.common.level")}</th>
                <th className="px-2 py-1 text-right">{t("keywords.common.cpc")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i} className="border-t hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono">{row.keyword}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {row.search_volume?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {row.competition != null ? row.competition.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-1">{row.competition_level ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {row.cpc != null ? formatUsd(row.cpc) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !view &&
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            {t("keywords.bulkVolume.empty")}
          </div>
        )
      )}
    </div>
  );
}
