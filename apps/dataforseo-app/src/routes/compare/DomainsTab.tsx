import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";

import BucketTab from "../../components/BucketTab";
import ChatWithResultsButton from "../../components/ChatWithResultsButton";
import CostPreview from "../../components/CostPreview";
import ExportMenu from "../../components/ExportMenu";
import ResultsTable from "../../components/ResultsTable";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatCount, formatUsd } from "../../lib/format";
import { tauriApi, type RankedKeyword } from "../../lib/tauri";

const KEYWORD_LIMIT = 200;

const BUCKET_LABELS: Record<"common" | "a" | "b", string> = {
  common: "common",
  a: "Only A",
  b: "Only B",
};

interface DomainCompareRow {
  keyword: string;
  set: "common" | "a" | "b";
  rank_a: number | null;
  rank_b: number | null;
  volume: number | null;
  etv_a: number | null;
  etv_b: number | null;
}

export default function DomainsTab() {
  const [domainA, setDomainA] = useState("");
  const [domainB, setDomainB] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<DomainCompareRow[]>([]);
  const [bucket, setBucket] = useState<"common" | "a" | "b">("common");
  const [costA, setCostA] = useState(0);
  const [costB, setCostB] = useState(0);

  const trimmedA = domainA.trim();
  const trimmedB = domainB.trim();

  async function onCompare() {
    if (!trimmedA || !trimmedB) return;
    setBusy(true);
    try {
      const [batchA, batchB] = await Promise.all([
        tauriApi.keywordsRanked({
          target: trimmedA,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          limit: KEYWORD_LIMIT,
          useCache: true,
        }),
        tauriApi.keywordsRanked({
          target: trimmedB,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          limit: KEYWORD_LIMIT,
          useCache: true,
        }),
      ]);

      const mapA = new Map(batchA.items.map((it: RankedKeyword) => [it.keyword, it]));
      const mapB = new Map(batchB.items.map((it: RankedKeyword) => [it.keyword, it]));

      const all = new Set<string>([...mapA.keys(), ...mapB.keys()]);
      const compareRows: DomainCompareRow[] = Array.from(all).map((keyword) => {
        const a = mapA.get(keyword);
        const b = mapB.get(keyword);
        const set: DomainCompareRow["set"] = a && b ? "common" : a ? "a" : "b";
        return {
          keyword,
          set,
          rank_a: a?.rank_absolute ?? null,
          rank_b: b?.rank_absolute ?? null,
          volume: a?.search_volume ?? b?.search_volume ?? null,
          etv_a: a?.etv ?? null,
          etv_b: b?.etv ?? null,
        };
      });
      // Sort by combined ETV desc — most-valuable shared keywords float to top.
      compareRows.sort((x, y) => {
        const xv = (x.etv_a ?? 0) + (x.etv_b ?? 0);
        const yv = (y.etv_a ?? 0) + (y.etv_b ?? 0);
        return yv - xv;
      });
      setRows(compareRows);
      setCostA(batchA.cost_usd);
      setCostB(batchB.cost_usd);
      toast.success(
        `${compareRows.length} keywords compared (${formatUsd(batchA.cost_usd + batchB.cost_usd)})`,
      );
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    let common = 0;
    let onlyA = 0;
    let onlyB = 0;
    for (const r of rows) {
      if (r.set === "common") common++;
      else if (r.set === "a") onlyA++;
      else onlyB++;
    }
    return { common, onlyA, onlyB };
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => r.set === bucket), [rows, bucket]);

  const columns = useMemo<ColumnDef<DomainCompareRow, unknown>[]>(
    () => [
      {
        header: "Keyword",
        accessorKey: "keyword",
        cell: (ctx) => <span className="font-mono">{ctx.getValue<string>()}</span>,
      },
      {
        header: "Volume",
        accessorKey: "volume",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatCount(v) : "—";
        },
      },
      {
        header: "Rank A",
        accessorKey: "rank_a",
        cell: (ctx) => ctx.getValue<number | null>() ?? "—",
      },
      {
        header: "Rank B",
        accessorKey: "rank_b",
        cell: (ctx) => ctx.getValue<number | null>() ?? "—",
      },
      {
        header: "ETV A",
        accessorKey: "etv_a",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatCount(v) : "—";
        },
      },
      {
        header: "ETV B",
        accessorKey: "etv_b",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatCount(v) : "—";
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Pick two domains. The page pulls each domain's top {KEYWORD_LIMIT} ranked
        keywords and groups them into Common / Only-A / Only-B. Use Only-B to
        find keywords your competitor ranks for and you don't (the keyword-gap).
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Domain A (yours)</span>
          <input
            type="text"
            value={domainA}
            onChange={(e) => setDomainA(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="myclient.de"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Domain B (competitor)</span>
          <input
            type="text"
            value={domainB}
            onChange={(e) => setDomainB(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="competitor.de"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "KeywordsForDomain", mode: "live" }}
            details={[
              `Each side fetches the top ${KEYWORD_LIMIT} ranked keywords`,
              `Location ${DEFAULT_LOCATION}, Language ${DEFAULT_LANGUAGE}`,
            ]}
            disabled={busy || !trimmedA || !trimmedB}
          />
          <button
            type="button"
            onClick={onCompare}
            disabled={busy || !trimmedA || !trimmedB}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Comparing…" : "Compare"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              Cost: A {formatUsd(costA)} · B {formatUsd(costB)} · total{" "}
              {formatUsd(costA + costB)}
            </span>
            <span className="ml-auto flex gap-2">
              <ChatWithResultsButton
                rows={filtered}
                summary={`${filtered.length} ${BUCKET_LABELS[bucket]} keywords for ${trimmedA} vs ${trimmedB}`}
              />
              <ExportMenu
                filenameStem={`compare-${trimmedA}-vs-${trimmedB}-${bucket}`}
                rows={filtered}
                columns={columns}
              />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BucketTab
              label={`Common (${counts.common})`}
              active={bucket === "common"}
              onClick={() => setBucket("common")}
            />
            <BucketTab
              label={`Only A (${counts.onlyA})`}
              active={bucket === "a"}
              onClick={() => setBucket("a")}
            />
            <BucketTab
              label={`Only B (${counts.onlyB})`}
              active={bucket === "b"}
              onClick={() => setBucket("b")}
            />
          </div>
          <ResultsTable
            data={filtered}
            columns={columns}
            emptyMessage="No keywords in this bucket."
          />
        </>
      )}

      {rows.length === 0 && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter two domains above and click Compare.
        </div>
      )}
    </div>
  );
}
