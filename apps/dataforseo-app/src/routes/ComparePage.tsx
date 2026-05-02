import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import BulkKeywordInput, { parseKeywords } from "../components/BulkKeywordInput";
import ChatWithResultsButton from "../components/ChatWithResultsButton";
import CostPreview from "../components/CostPreview";
import ExportMenu from "../components/ExportMenu";
import ResultsTable from "../components/ResultsTable";
import { formatCount, formatUsd } from "../lib/format";
import { tauriApi, type KeywordVolume } from "../lib/tauri";

const DEFAULT_LOCATION = 2276;
const DEFAULT_LANGUAGE = "de";

interface CompareRow {
  keyword: string;
  set: "common" | "a" | "b";
  volume_a: number | null;
  volume_b: number | null;
  cpc_a: number | null;
  cpc_b: number | null;
  competition_a: string | null;
  competition_b: string | null;
}

export default function ComparePage() {
  const [rawA, setRawA] = useState("");
  const [rawB, setRawB] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [bucket, setBucket] = useState<"common" | "a" | "b">("common");

  const keywordsA = useMemo(() => parseKeywords(rawA), [rawA]);
  const keywordsB = useMemo(() => parseKeywords(rawB), [rawB]);
  const totalUnique = useMemo(
    () => new Set([...keywordsA, ...keywordsB]).size,
    [keywordsA, keywordsB],
  );
  const overLimit =
    keywordsA.length > 1000 || keywordsB.length > 1000 || totalUnique > 1000;

  async function onCompare() {
    if (keywordsA.length === 0 || keywordsB.length === 0 || overLimit) {
      return;
    }
    setBusy(true);
    try {
      // One request for the union — search_volume's cache already
      // deduplicates per (keyword, location, language) so paying for
      // overlap is impossible. Iterating the input keyword sets (not
      // the response) means missing API rows still show up in the
      // result with null volume instead of vanishing.
      const allUnique = Array.from(new Set([...keywordsA, ...keywordsB]));
      const batch = await tauriApi.keywordsSearchVolume({
        keywords: allUnique,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        useCache: true,
      });

      const resultMap = new Map(
        batch.items.map((it: KeywordVolume) => [it.keyword, it]),
      );
      const setA = new Set(keywordsA);
      const setB = new Set(keywordsB);

      const compareRows: CompareRow[] = allUnique.map((keyword) => {
        const data = resultMap.get(keyword);
        const inA = setA.has(keyword);
        const inB = setB.has(keyword);
        return {
          keyword,
          set: inA && inB ? "common" : inA ? "a" : "b",
          volume_a: inA ? (data?.search_volume ?? null) : null,
          volume_b: inB ? (data?.search_volume ?? null) : null,
          cpc_a: inA ? (data?.cpc ?? null) : null,
          cpc_b: inB ? (data?.cpc ?? null) : null,
          competition_a: inA ? (data?.competition ?? null) : null,
          competition_b: inB ? (data?.competition ?? null) : null,
        };
      });
      compareRows.sort((x, y) => {
        const xv = Math.max(x.volume_a ?? 0, x.volume_b ?? 0);
        const yv = Math.max(y.volume_a ?? 0, y.volume_b ?? 0);
        return yv - xv;
      });
      setRows(compareRows);
      toast.success(
        `${compareRows.length} keywords compared (${formatUsd(batch.cost_usd)} fresh, rest from cache)`,
      );
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
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

  const filtered = useMemo(
    () => rows.filter((r) => r.set === bucket),
    [rows, bucket],
  );

  const columns = useMemo<ColumnDef<CompareRow, unknown>[]>(
    () => [
      {
        header: "Keyword",
        accessorKey: "keyword",
        cell: (ctx) => <span className="font-mono">{ctx.getValue<string>()}</span>,
      },
      {
        header: "Volume A",
        accessorKey: "volume_a",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatCount(v) : "—";
        },
      },
      {
        header: "Volume B",
        accessorKey: "volume_b",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatCount(v) : "—";
        },
      },
      {
        header: "CPC A",
        accessorKey: "cpc_a",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatUsd(v) : "—";
        },
      },
      {
        header: "CPC B",
        accessorKey: "cpc_b",
        cell: (ctx) => {
          const v = ctx.getValue<number | null>();
          return v != null ? formatUsd(v) : "—";
        },
      },
    ],
    [],
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Compare keyword sets</h2>
        <p className="text-sm text-slate-600">
          Paste two lists of keywords, see what overlaps and what's unique to
          each side. Volume + CPC data uses the existing search-volume cache,
          so repeated comparisons are free for keywords already fetched.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_320px]">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Set A</h3>
          <BulkKeywordInput value={rawA} onChange={setRawA} disabled={busy} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Set B</h3>
          <BulkKeywordInput value={rawB} onChange={setRawB} disabled={busy} />
        </div>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{
              kind: "KeywordsSearchVolume",
              count: totalUnique,
              mode: "live",
            }}
            details={[
              `${keywordsA.length} in A, ${keywordsB.length} in B (${totalUnique} unique)`,
              `Location ${DEFAULT_LOCATION}, Language ${DEFAULT_LANGUAGE}`,
              "Cache reused per keyword",
            ]}
            disabled={
              busy ||
              keywordsA.length === 0 ||
              keywordsB.length === 0 ||
              overLimit
            }
          />
          <button
            type="button"
            onClick={onCompare}
            disabled={
              busy ||
              keywordsA.length === 0 ||
              keywordsB.length === 0 ||
              overLimit
            }
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Comparing…" : "Compare"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <>
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
            <div className="ml-auto flex gap-2">
              <ChatWithResultsButton
                rows={filtered}
                summary={`${filtered.length} ${bucket} keywords from compare`}
              />
              <ExportMenu
                filenameStem={`compare-${bucket}`}
                rows={filtered}
                columns={columns}
              />
            </div>
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
          Paste keywords into both sides and click Compare.
        </div>
      )}
    </section>
  );
}

function BucketTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-1 text-xs ${
        active ? "border-slate-800 bg-slate-100" : "hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
