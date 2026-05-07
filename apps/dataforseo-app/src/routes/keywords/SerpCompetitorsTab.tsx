import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { formatError } from "../../lib/errors";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type SerpCompetitor, type SerpCompetitorsView } from "../../lib/tauri";

export default function SerpCompetitorsTab() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<SerpCompetitorsView | null>(null);

  const trimmed = keyword.trim();

  const exportColumns = useMemo<ColumnDef<SerpCompetitor, unknown>[]>(
    () => [
      { id: "domain", header: t("keywords.common.domain"), accessorKey: "domain" },
      {
        id: "avg_position",
        header: t("keywords.serpCompetitors.avgPos"),
        accessorKey: "avg_position",
      },
      {
        id: "median_position",
        header: t("keywords.serpCompetitors.medianPos"),
        accessorKey: "median_position",
      },
      { id: "etv", header: t("keywords.serpCompetitors.etv"), accessorKey: "etv" },
      {
        id: "count",
        header: t("keywords.serpCompetitors.keywordsHeader"),
        accessorKey: "count",
      },
      { id: "rating", header: t("keywords.common.rating"), accessorKey: "rating" },
    ],
    [t],
  );

  async function onRun() {
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsSerpCompetitors({
        keyword: trimmed,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: 100,
        useCache: true,
      });
      setView(result);
      toast.success(
        t("keywords.serpCompetitors.loaded", {
          count: result.items.length,
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
      <p className="text-sm text-slate-600">{t("keywords.serpCompetitors.description")}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("keywords.common.keyword")}</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo tools"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "LabsSerpCompetitors" }}
            details={[
              t("keywords.serpCompetitors.perRequest"),
              t("keywords.serpCompetitors.upTo100"),
            ]}
            disabled={!trimmed || busy}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !trimmed}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("keywords.common.loading") : t("keywords.common.lookup")}
          </button>
        </div>
      </div>

      {view && view.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {t("keywords.serpCompetitors.summary", {
                count: view.items.length,
                keyword: view.keyword,
                cost: formatUsd(view.cost_usd),
              })}
            </span>
            <ExportMenu
              filenameStem={`serp-competitors-${view.keyword}`}
              rows={view.items}
              columns={exportColumns}
            />
          </div>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left">{t("keywords.common.domain")}</th>
                  <th className="px-2 py-1 text-right">
                    {t("keywords.serpCompetitors.avgPos")}
                  </th>
                  <th className="px-2 py-1 text-right">
                    {t("keywords.serpCompetitors.medianPos")}
                  </th>
                  <th className="px-2 py-1 text-right">{t("keywords.serpCompetitors.etv")}</th>
                  <th className="px-2 py-1 text-right">
                    {t("keywords.serpCompetitors.keywordsHeader")}
                  </th>
                  <th className="px-2 py-1 text-right">{t("keywords.common.rating")}</th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-1 font-mono">{row.domain ?? "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.avg_position != null ? row.avg_position.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.median_position != null ? row.median_position.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.etv != null ? row.etv.toFixed(0) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{row.count ?? "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.rating != null ? row.rating.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : view ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          {t("keywords.serpCompetitors.noResults")}
        </div>
      ) : (
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            {t("keywords.serpCompetitors.empty")}
          </div>
        )
      )}
    </div>
  );
}
