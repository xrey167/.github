import { useMemo, useState } from "react";

import type { PlannedPost, TopicCluster } from "../../lib/tauri";
import PostForm, { STATUS_COLORS, type Status } from "./PostForm";
import type { PlannedPostInput } from "../../lib/tauri";

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function ymd(d: Date): string {
  // Local-time YYYY-MM-DD; matches HTML date input output so values
  // round-trip without timezone drift.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/// 6×7 grid for the given month, padded with adjacent-month days so the
/// weekday columns line up.
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // ISO weeks start Monday — shift Sunday (0) to slot 6 so Mon=0..Sun=6.
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  posts: PlannedPost[];
  clusters: TopicCluster[];
  loading: boolean;
  busy: boolean;
  defaultProjectId: number | null;
  onSave: (
    post: PlannedPost | null,
    input: PlannedPostInput,
  ) => void | Promise<void>;
  onDelete: (post: PlannedPost) => void | Promise<void>;
  onOpenBrief: (post: PlannedPost) => void;
}

export default function CalendarTab({
  posts,
  clusters,
  loading,
  busy,
  defaultProjectId,
  onSave,
  onDelete,
  onOpenBrief,
}: Props) {
  const [editing, setEditing] = useState<PlannedPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDate = useMemo(() => {
    const m = new Map<string, PlannedPost[]>();
    for (const p of posts) {
      if (!p.scheduled_for) continue;
      const key = p.scheduled_for.slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return m;
  }, [posts]);

  const grid = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  // Compute today's ymd once per render rather than 42× inside the grid loop.
  const todayYmd = useMemo(() => ymd(new Date()), []);

  const unscheduled = useMemo(
    () => posts.filter((p) => !p.scheduled_for),
    [posts],
  );

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function startNew(scheduledFor?: string) {
    setEditing({
      id: 0,
      project_id: defaultProjectId,
      cluster_id: null,
      title: "",
      target_keyword: null,
      status: "idea",
      scheduled_for: scheduledFor ?? null,
      notes: null,
      brief_md: null,
      brief_model: null,
      brief_generated_at: null,
      created_at: null,
      updated_at: null,
    });
    setShowForm(true);
  }

  async function handleSave(input: PlannedPostInput) {
    await onSave(editing && editing.id > 0 ? editing : null, input);
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => startNew()}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          + New post
        </button>
      </div>

      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded px-2 py-1 text-sm hover:bg-slate-100"
            aria-label="Previous month"
          >
            ◀
          </button>
          <h3 className="text-sm font-semibold">{formatMonth(cursor)}</h3>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded px-2 py-1 text-sm hover:bg-slate-100"
            aria-label="Next month"
          >
            ▶
          </button>
        </div>
        <div className="grid grid-cols-7 border-b text-[11px] uppercase text-slate-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="border-r px-2 py-1 last:border-r-0">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const key = ymd(d);
            const dayPosts = byDate.get(key) ?? [];
            const isToday = key === todayYmd;
            return (
              // Cell is a div (not button) so the inner buttons can each
              // be focused independently — nesting <button> inside
              // <button> is invalid HTML and breaks keyboard nav.
              <div
                key={i}
                className={`flex min-h-24 flex-col gap-0.5 border-b border-r p-1 text-left text-[11px] last:border-r-0 ${
                  inMonth ? "bg-white" : "bg-slate-50/50 text-slate-400"
                }`}
              >
                <button
                  type="button"
                  onClick={() => startNew(key)}
                  aria-label={`Add post for ${key}`}
                  className={`self-start rounded text-[10px] hover:underline ${
                    isToday ? "font-bold text-blue-700" : "text-slate-500"
                  }`}
                >
                  {d.getDate()}
                </button>
                <div className="flex flex-col gap-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setEditing(p);
                        setShowForm(true);
                      }}
                      className={`truncate rounded px-1 py-0.5 text-left text-[10px] hover:opacity-80 ${
                        STATUS_COLORS[p.status as Status] ?? STATUS_COLORS.idea
                      }`}
                      title={p.title}
                    >
                      {p.title}
                    </button>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[9px] text-slate-500">
                      +{dayPosts.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded border bg-white">
        <h3 className="border-b px-3 py-2 text-sm font-semibold">
          Unscheduled ideas{" "}
          <span className="font-normal text-slate-500">
            ({unscheduled.length})
          </span>
        </h3>
        {loading ? (
          <p className="px-3 py-4 text-sm text-slate-500">Loading…</p>
        ) : unscheduled.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">
            No unscheduled posts. Click a calendar cell or "+ New post" to add one.
          </p>
        ) : (
          <ul className="divide-y">
            {unscheduled.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    STATUS_COLORS[p.status as Status] ?? STATUS_COLORS.idea
                  }`}
                >
                  {p.status}
                </span>
                <span className="font-medium">{p.title}</span>
                {p.target_keyword && (
                  <span className="font-mono text-xs text-slate-500">
                    → {p.target_keyword}
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(p);
                      setShowForm(true);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && editing && (
        <PostForm
          post={editing}
          clusters={clusters}
          busy={busy}
          onSave={handleSave}
          onDelete={
            editing.id > 0
              ? async () => {
                  await onDelete(editing);
                  setShowForm(false);
                  setEditing(null);
                }
              : undefined
          }
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onOpenBrief={
            editing.id > 0
              ? () => {
                  // Hand off to the host's BriefView. Close the form so the
                  // user isn't stacking modals.
                  const target = editing;
                  setShowForm(false);
                  setEditing(null);
                  onOpenBrief(target);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
