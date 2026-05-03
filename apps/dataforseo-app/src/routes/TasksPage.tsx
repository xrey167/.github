import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { tauriApi, type BatchSummary, type TaskBatchStatus } from "../lib/tauri";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  ready: "bg-sky-100 text-sky-800",
  fetched: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

export default function TasksPage() {
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [selected, setSelected] = useState<TaskBatchStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshBatches() {
    setBusy(true);
    try {
      const list = await tauriApi.serpTaskRecentBatches({ limit: 50 });
      setBatches(list);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function selectBatch(batchId: string) {
    setBusy(true);
    try {
      const status = await tauriApi.serpTaskStatus({ batchId });
      setSelected(status);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshBatches();
    // The Rust poller ticks every 30s, so a 30s UI refresh is sufficient
    // to surface progress without piling up duplicate work.
    const id = setInterval(refreshBatches, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-sm text-slate-600">
            Standard-Queue SERP batches. Auto-refreshes every 30s.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshBatches}
          disabled={busy}
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        >
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-1">
          {batches?.length === 0 && (
            <div className="rounded border bg-white p-4 text-sm text-slate-500">
              No batches yet. Submit one from /serp → Bulk.
            </div>
          )}
          {batches?.map((b) => (
            <button
              key={b.batch_id}
              type="button"
              onClick={() => selectBatch(b.batch_id)}
              className={`rounded border bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                selected?.batch_id === b.batch_id ? "border-slate-800" : ""
              }`}
            >
              <div className="font-mono text-xs">{b.batch_id}</div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                {b.pending > 0 && <Pill kind="pending" count={b.pending} />}
                {b.ready > 0 && <Pill kind="ready" count={b.ready} />}
                {b.fetched > 0 && <Pill kind="fetched" count={b.fetched} />}
                {b.failed > 0 && <Pill kind="failed" count={b.failed} />}
                <span className="text-slate-500">/ {b.total}</span>
              </div>
            </button>
          ))}
        </div>

        <div>
          {!selected && (
            <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
              Select a batch to inspect tasks and results.
            </div>
          )}
          {selected && (
            <div className="flex flex-col gap-3">
              {selected.tasks.map((t) => (
                <div key={t.task_id} className="rounded border bg-white p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Pill kind={t.status} />
                    <span className="font-mono">{t.keyword}</span>
                    <span className="ml-auto text-slate-500">
                      depth {t.depth}, attempts {t.poll_attempts}
                    </span>
                  </div>
                  {selected.results[t.task_id] && (
                    <ol className="mt-2 list-decimal pl-5 text-sm">
                      {selected.results[t.task_id].slice(0, 5).map((item) => (
                        <li key={item.position}>
                          <span className="font-mono text-xs text-slate-500">
                            #{item.position}
                          </span>{" "}
                          {item.title ?? item.url ?? item.kind}{" "}
                          {item.domain && (
                            <span className="text-xs text-slate-500">({item.domain})</span>
                          )}
                        </li>
                      ))}
                      {selected.results[t.task_id].length > 5 && (
                        <li className="text-xs text-slate-500">
                          +{selected.results[t.task_id].length - 5} more
                        </li>
                      )}
                    </ol>
                  )}
                  {t.error && (
                    <div className="mt-2 text-xs text-rose-700">{t.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Pill({ kind, count }: { kind: string; count?: number }) {
  const className = STATUS_COLORS[kind] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded px-1.5 py-0.5 ${className}`}>
      {count != null ? `${count} ${kind}` : kind}
    </span>
  );
}
