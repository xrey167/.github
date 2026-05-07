import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { formatError } from "../../lib/errors";

import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import {
  tauriApi,
  type BulkDifficultyItem,
  type BulkDifficultyView,
} from "../../lib/tauri";

const MAX_KEYWORDS = 1000;

export default function DifficultyTab() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<BulkDifficultyView | null>(null);

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

  async function onRun() {
    if (keywords.length === 0) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsBulkKeywordDifficulty({
        keywords,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache: true,
      });
      setView(result);
      toast.success(
        t("keywords.difficulty.loaded", {
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
      <p className="text-sm text-slate-600">
        {t("keywords.difficulty.description", { max: MAX_KEYWORDS })}
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
          <CostPreview
            action={{
              kind: "LabsBulkKeywordDifficulty",
              count: keywords.length,
            }}
            details={[
              t("keywords.bulkVolume.keywordsLabel", {
                count: keywords.length,
                max: MAX_KEYWORDS,
              }),
              t("keywords.bulkVolume.perKeyword"),
            ]}
            disabled={busy || keywords.length === 0}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || keywords.length === 0}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? t("keywords.common.loading") : t("keywords.difficulty.lookupButton")}
          </button>
        </div>
      </div>

      {view && view.items.length > 0 ? (
        <DifficultyTable view={view} />
      ) : view ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          {t("keywords.difficulty.noResults")}
        </div>
      ) : (
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            {t("keywords.difficulty.empty")}
          </div>
        )
      )}
    </div>
  );
}

function DifficultyTable({ view }: { view: BulkDifficultyView }) {
  const { t } = useTranslation();
  // Sort hardest first; keywords with no score sink to the bottom.
  const sorted = useMemo(
    () =>
      [...view.items].sort((a, b) => {
        const av = a.keyword_difficulty ?? -1;
        const bv = b.keyword_difficulty ?? -1;
        return bv - av;
      }),
    [view.items],
  );

  const exportColumns = useMemo<ColumnDef<BulkDifficultyItem, unknown>[]>(
    () => [
      { id: "keyword", header: t("keywords.common.keyword"), accessorKey: "keyword" },
      {
        id: "keyword_difficulty",
        header: t("keywords.common.difficulty"),
        accessorKey: "keyword_difficulty",
      },
      {
        id: "bucket",
        header: t("keywords.difficulty.bucket"),
        accessorFn: (row) => bucketLabel(row.keyword_difficulty, t),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{t("keywords.difficulty.summary", { count: view.items.length })}</span>
        <span className="ml-auto">
          {t("keywords.common.actualEstimated", {
            actual: formatUsd(view.cost_usd),
            estimated: formatUsd(view.estimated_usd),
          })}
        </span>
        <ExportMenu
          filenameStem="keyword-difficulty"
          rows={sorted}
          columns={exportColumns}
        />
      </div>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-left">{t("keywords.common.keyword")}</th>
              <th className="px-2 py-1 text-right">{t("keywords.common.difficulty")}</th>
              <th className="px-2 py-1 text-left">{t("keywords.difficulty.bucket")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                <td className="px-2 py-1 font-mono">{row.keyword}</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {row.keyword_difficulty != null ? row.keyword_difficulty : "—"}
                </td>
                <td className="px-2 py-1">{bucketLabel(row.keyword_difficulty, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Standard 0–100 difficulty buckets used across SEO tooling.
function bucketLabel(d: number | null, t: (k: string) => string): string {
  if (d == null) return "—";
  if (d < 15) return t("keywords.difficulty.buckets.veryEasy");
  if (d < 30) return t("keywords.difficulty.buckets.easy");
  if (d < 50) return t("keywords.difficulty.buckets.possible");
  if (d < 70) return t("keywords.difficulty.buckets.difficult");
  if (d < 85) return t("keywords.difficulty.buckets.hard");
  return t("keywords.difficulty.buckets.veryHard");
}
