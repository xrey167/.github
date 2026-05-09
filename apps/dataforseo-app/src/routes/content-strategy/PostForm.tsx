import { useState } from "react";

import type {
  PlannedPost,
  PlannedPostInput,
  TopicCluster,
} from "../../lib/tauri";

export const STATUSES = [
  "idea",
  "drafting",
  "review",
  "published",
  "archived",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_COLORS: Record<Status, string> = {
  idea: "bg-slate-100 text-slate-700",
  drafting: "bg-amber-100 text-amber-800",
  review: "bg-violet-100 text-violet-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-200 text-slate-500",
};

interface Props {
  post: PlannedPost;
  clusters: TopicCluster[];
  busy: boolean;
  onSave: (input: PlannedPostInput) => void | Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function PostForm({
  post,
  clusters,
  busy,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(post.title);
  const [targetKeyword, setTargetKeyword] = useState(post.target_keyword ?? "");
  const [status, setStatus] = useState<Status>(
    (post.status as Status) ?? "idea",
  );
  const [scheduledFor, setScheduledFor] = useState(post.scheduled_for ?? "");
  const [notes, setNotes] = useState(post.notes ?? "");
  const [clusterId, setClusterId] = useState<string>(
    post.cluster_id?.toString() ?? "",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    void onSave({
      project_id: post.project_id,
      cluster_id: clusterId ? Number(clusterId) : null,
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Cluster</span>
          <select
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
          >
            <option value="">— No cluster —</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.pillar_keyword ? ` (${c.pillar_keyword})` : ""}
              </option>
            ))}
          </select>
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
