import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";
import { useProject } from "../lib/project-store";
import {
  tauriApi,
  type PlannedPost,
  type PlannedPostInput,
} from "../lib/tauri";

const STATUSES = ["idea", "drafting", "review", "published", "archived"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  idea: "bg-slate-100 text-slate-700",
  drafting: "bg-amber-100 text-amber-800",
  review: "bg-violet-100 text-violet-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-200 text-slate-500",
};

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function ymd(d: Date): string {
  // Local-time YYYY-MM-DD; matches what an HTML date input emits, so stored
  // values round-trip through the form without timezone drift.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/// Build a 6×7 grid for the given month, padding with adjacent-month days
/// so weekday columns line up. Mirrors the layout most CMS calendars use.
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

export default function ContentStrategyPage() {
  const { active: project } = useProject();

  const [posts, setPosts] = useState<PlannedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PlannedPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await tauriApi.plannedPostsList({
        projectId: project?.id ?? null,
      });
      setPosts(list);
    } catch (e) {
      toast.error(formatError(e, "Planned posts"));
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Group posts by their scheduled_for date for fast calendar lookup.
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

  const unscheduled = useMemo(() => posts.filter((p) => !p.scheduled_for), [posts]);

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function startNew(scheduledFor?: string) {
    setEditing({
      id: 0,
      project_id: project?.id ?? null,
      title: "",
      target_keyword: null,
      status: "idea",
      scheduled_for: scheduledFor ?? null,
      notes: null,
      created_at: null,
      updated_at: null,
    });
    setShowForm(true);
  }

  async function save(input: PlannedPostInput) {
    setBusy(true);
    try {
      if (editing && editing.id > 0) {
        await tauriApi.plannedPostsUpdate({ id: editing.id, input });
        toast.success("Post updated");
      } else {
        await tauriApi.plannedPostsCreate({ input });
        toast.success("Post added");
      }
      setShowForm(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error(formatError(e, "Save"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(post: PlannedPost) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    setBusy(true);
    try {
      await tauriApi.plannedPostsDelete({ id: post.id });
      toast.success("Post deleted");
      await refresh();
    } catch (e) {
      toast.error(formatError(e, "Delete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Content Strategy</h2>
          <p className="text-sm text-slate-600">
            Editorial calendar — plan posts per project, track status, and stage
            target keywords. Phase 2 will add topic clusters and the gap-to-brief
            pipeline.
          </p>
          {project && (
            <p className="mt-1 text-xs text-slate-500">
              Project: <strong>{project.name}</strong> ({project.target})
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => startNew()}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          + New post
        </button>
      </header>

      {/* Calendar */}
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
            const isToday = key === ymd(new Date());
            return (
              <button
                key={i}
                type="button"
                onClick={() => startNew(key)}
                className={`flex min-h-24 flex-col gap-0.5 border-b border-r p-1 text-left text-[11px] hover:bg-slate-50 last:border-r-0 ${
                  inMonth ? "bg-white" : "bg-slate-50/50 text-slate-400"
                }`}
              >
                <span
                  className={`text-[10px] ${
                    isToday ? "font-bold text-blue-700" : "text-slate-500"
                  }`}
                >
                  {d.getDate()}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(p);
                        setShowForm(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setEditing(p);
                          setShowForm(true);
                        }
                      }}
                      className={`truncate rounded px-1 py-0.5 text-[10px] hover:opacity-80 ${
                        STATUS_COLORS[p.status as Status] ??
                        STATUS_COLORS.idea
                      }`}
                      title={p.title}
                    >
                      {p.title}
                    </span>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[9px] text-slate-500">
                      +{dayPosts.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unscheduled bucket */}
      <div className="rounded border bg-white">
        <h3 className="border-b px-3 py-2 text-sm font-semibold">
          Unscheduled ideas{" "}
          <span className="font-normal text-slate-500">({unscheduled.length})</span>
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
                    onClick={() => remove(p)}
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

      {/* Edit / Create modal */}
      {showForm && editing && (
        <PostForm
          post={editing}
          busy={busy}
          onSave={save}
          onDelete={
            editing.id > 0
              ? () => {
                  void remove(editing).then(() => {
                    setShowForm(false);
                    setEditing(null);
                  });
                }
              : undefined
          }
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function PostForm({
  post,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  post: PlannedPost;
  busy: boolean;
  onSave: (input: PlannedPostInput) => void | Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [targetKeyword, setTargetKeyword] = useState(post.target_keyword ?? "");
  const [status, setStatus] = useState<Status>((post.status as Status) ?? "idea");
  const [scheduledFor, setScheduledFor] = useState(post.scheduled_for ?? "");
  const [notes, setNotes] = useState(post.notes ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    void onSave({
      project_id: post.project_id,
      title: title.trim(),
      target_keyword: targetKeyword.trim() || null,
      status,
      scheduled_for: scheduledFor || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="flex w-full max-w-md flex-col gap-3 rounded border bg-white p-4 shadow-xl"
      >
        <h3 className="text-sm font-semibold">
          {post.id > 0 ? "Edit post" : "New post"}
        </h3>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            required
            className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
            placeholder="How to pick an SEO agency"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Target keyword</span>
          <input
            type="text"
            value={targetKeyword}
            onChange={(e) => setTargetKeyword(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="seo agency"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              disabled={busy}
              className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Scheduled</span>
            <input
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={busy}
              className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
            className="h-20 rounded border px-2 py-1 text-sm disabled:bg-slate-50"
            placeholder="Outline, references, internal links to add…"
          />
        </label>
        <div className="flex justify-between gap-2 pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
