import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";
import { tauriApi, type ReportRun, type ReportSchedule } from "../lib/tauri";
import { useProject } from "../lib/project-store";

const KIND_LABELS: Record<string, string> = {
  "daily-tracking": "Daily Keyword Tracking",
  "weekly-audit": "Weekly Site Audit",
  "weekly-brand": "Weekly Brand Monitor",
};
const CADENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
};

export default function ReportsPage() {
  const { active: activeProject } = useProject();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [runs, setRuns] = useState<Record<number, ReportRun[]>>({});
  const [busy, setBusy] = useState(false);

  // New schedule form state
  const [kind, setKind] = useState("daily-tracking");
  const [cadence, setCadence] = useState("daily");

  const refresh = useCallback(async () => {
    try {
      const list = await tauriApi.reportsListSchedules();
      setSchedules(list);
    } catch (e) {
      toast.error(formatError(e, "Schedules"));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function loadRuns(scheduleId: number) {
    if (runs[scheduleId]) return;
    try {
      const r = await tauriApi.reportsListRuns({ scheduleId });
      setRuns((prev) => ({ ...prev, [scheduleId]: r }));
    } catch (e) {
      toast.error(formatError(e, "Runs"));
    }
  }

  async function create() {
    setBusy(true);
    try {
      await tauriApi.reportsCreateSchedule({
        projectId: activeProject?.id ?? null,
        kind,
        cadence,
      });
      toast.success("Schedule created — reports will generate on next hourly tick.");
      await refresh();
    } catch (e) {
      toast.error(formatError(e, "Create schedule"));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: ReportSchedule) {
    setBusy(true);
    try {
      await tauriApi.reportsToggleSchedule({ id: s.id, active: !s.active });
      await refresh();
    } catch (e) {
      toast.error(formatError(e, "Toggle"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: ReportSchedule) {
    if (!confirm(`Delete schedule "${KIND_LABELS[s.kind] ?? s.kind}"?`)) return;
    setBusy(true);
    try {
      await tauriApi.reportsDeleteSchedule({ id: s.id });
      setRuns((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
      await refresh();
    } catch (e) {
      toast.error(formatError(e, "Delete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Scheduled PDF Reports</h2>
        <p className="text-sm text-slate-600">
          Configure recurring reports. The background task runs every hour and saves PDFs
          to your Documents folder under <code>DataForSEO Reports/</code>.
        </p>
        {activeProject && (
          <p className="mt-1 text-xs text-slate-500">
            Active project: <strong>{activeProject.name}</strong> — new schedules will be
            scoped to this project.
          </p>
        )}
      </header>

      {/* Create form */}
      <div className="rounded border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">New Schedule</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Report type</span>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setCadence(e.target.value.startsWith("daily") ? "daily" : "weekly");
              }}
              className="rounded border px-2 py-1 text-sm"
            >
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Cadence</span>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              {Object.entries(CADENCE_LABELS).map(([c, label]) => (
                <option key={c} value={c}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            + Add schedule
          </button>
        </div>
      </div>

      {/* Schedule list */}
      {schedules.length === 0 ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          No schedules yet. Create one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              runs={runs[s.id]}
              busy={busy}
              onToggle={() => toggle(s)}
              onDelete={() => remove(s)}
              onExpand={() => loadRuns(s.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleCard({
  schedule,
  runs,
  busy,
  onToggle,
  onDelete,
  onExpand,
}: {
  schedule: ReportSchedule;
  runs: ReportRun[] | undefined;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onExpand: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function handleExpand() {
    if (!expanded) onExpand();
    setExpanded((v) => !v);
  }

  return (
    <div className={`rounded border bg-white ${!schedule.active ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium">
            {KIND_LABELS[schedule.kind] ?? schedule.kind}
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              {CADENCE_LABELS[schedule.cadence] ?? schedule.cadence}
            </span>
            {!schedule.active && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                Paused
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {schedule.last_run_at
              ? `Last run: ${schedule.last_run_at.slice(0, 16)}`
              : "Never run"}
            {" · "}
            Schedule #{schedule.id}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpand}
            className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50"
          >
            {expanded ? "Hide runs" : "Show runs"}
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={busy}
            className="rounded border px-2 py-0.5 text-xs disabled:opacity-50"
          >
            {schedule.active ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 disabled:opacity-50 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-2">
          {runs == null ? (
            <div className="text-xs text-slate-500">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="text-xs text-slate-500">No runs yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-1 text-left font-medium">Generated</th>
                  <th className="py-1 text-left font-medium">File</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1 pr-4 tabular-nums">
                      {r.generated_at?.slice(0, 16) ?? "—"}
                    </td>
                    <td className="py-1 font-mono text-slate-700 break-all">
                      {r.pdf_path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
