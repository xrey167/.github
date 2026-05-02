import { useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../../components/CostPreview";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";
import { formatUsd } from "../../lib/format";
import { tauriApi, type DomainIntersectionView } from "../../lib/tauri";

export default function DomainIntersectionTab() {
  const [target1, setTarget1] = useState("");
  const [target2, setTarget2] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<DomainIntersectionView | null>(null);

  const t1 = target1.trim();
  const t2 = target2.trim();
  const canRun = t1.length > 0 && t2.length > 0;

  async function onRun() {
    if (!canRun) return;
    setBusy(true);
    try {
      const result = await tauriApi.labsDomainIntersection({
        target1: t1,
        target2: t2,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        limit: 200,
      });
      setView(result);
      toast.success(`${result.items.length} shared keywords (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-600">
        Keywords that both domains rank for simultaneously — the competitive keyword overlap. Each
        row shows both domains' SERP positions so you can spot where one outranks the other.
        0.0125 USD per request.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_320px]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Domain 1</span>
          <input
            type="text"
            value={target1}
            onChange={(e) => setTarget1(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="yourdomain.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Domain 2</span>
          <input
            type="text"
            value={target2}
            onChange={(e) => setTarget2(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="competitor.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-col gap-3">
          <CostPreview
            action={{ kind: "LabsDomainIntersection" }}
            details={["0.0125 USD per request", "Up to 200 keywords"]}
            disabled={!canRun || busy}
          />
          <button
            type="button"
            onClick={onRun}
            disabled={busy || !canRun}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Compare"}
          </button>
        </div>
      </div>

      {view && view.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500">
            {view.items.length} shared keywords for {view.target1} vs {view.target2} ·{" "}
            {formatUsd(view.cost_usd)}
          </p>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-1 text-left">Keyword</th>
                  <th className="px-2 py-1 text-right">Vol</th>
                  <th className="px-2 py-1 text-right">KD</th>
                  <th className="px-2 py-1 text-right" title={view.target1}>
                    {shortDomain(view.target1)} Pos
                  </th>
                  <th className="px-2 py-1 text-right" title={view.target2}>
                    {shortDomain(view.target2)} Pos
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((row, i) => {
                  const lead =
                    row.rank_first != null && row.rank_second != null
                      ? row.rank_first < row.rank_second
                        ? "first"
                        : row.rank_second < row.rank_first
                          ? "second"
                          : "tie"
                      : null;
                  return (
                    <tr key={i} className="border-t hover:bg-slate-50">
                      <td className="px-2 py-1 font-mono">{row.keyword}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {row.search_volume != null
                          ? row.search_volume.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {row.keyword_difficulty ?? "—"}
                      </td>
                      <td
                        className={`px-2 py-1 text-right tabular-nums ${
                          lead === "first" ? "font-semibold text-emerald-700" : ""
                        }`}
                      >
                        {row.rank_first ?? "—"}
                      </td>
                      <td
                        className={`px-2 py-1 text-right tabular-nums ${
                          lead === "second" ? "font-semibold text-emerald-700" : ""
                        }`}
                      >
                        {row.rank_second ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : view ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          No shared keywords found for these two domains.
        </div>
      ) : (
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Enter two domains above and click Compare.
          </div>
        )
      )}
    </div>
  );
}

function shortDomain(domain: string): string {
  return domain.replace(/^www\./, "").split(".")[0] ?? domain;
}
