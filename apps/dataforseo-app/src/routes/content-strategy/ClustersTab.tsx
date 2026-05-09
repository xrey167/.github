import { useMemo, useState } from "react";

import type {
  PlannedPost,
  TopicCluster,
  TopicClusterInput,
} from "../../lib/tauri";
import { STATUS_COLORS, type Status } from "./PostForm";

const COLORS = [
  { id: "slate", swatch: "bg-slate-200" },
  { id: "blue", swatch: "bg-blue-200" },
  { id: "emerald", swatch: "bg-emerald-200" },
  { id: "amber", swatch: "bg-amber-200" },
  { id: "violet", swatch: "bg-violet-200" },
  { id: "rose", swatch: "bg-rose-200" },
] as const;

const COLOR_BAR: Record<string, string> = {
  slate: "border-l-slate-400",
  blue: "border-l-blue-500",
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
  rose: "border-l-rose-500",
};

interface Props {
  clusters: TopicCluster[];
  posts: PlannedPost[];
  loading: boolean;
  busy: boolean;
  defaultProjectId: number | null;
  onSaveCluster: (
    cluster: TopicCluster | null,
    input: TopicClusterInput,
  ) => void | Promise<void>;
  onDeleteCluster: (cluster: TopicCluster) => void | Promise<void>;
  onEditPost: (post: PlannedPost) => void;
}

export default function ClustersTab({
  clusters,
  posts,
  loading,
  busy,
  defaultProjectId,
  onSaveCluster,
  onDeleteCluster,
  onEditPost,
}: Props) {
  const [editing, setEditing] = useState<TopicCluster | null>(null);
  const [showForm, setShowForm] = useState(false);

  const postsByCluster = useMemo(() => {
    const m = new Map<number, PlannedPost[]>();
    for (const p of posts) {
      if (p.cluster_id == null) continue;
      const arr = m.get(p.cluster_id) ?? [];
      arr.push(p);
      m.set(p.cluster_id, arr);
    }
    return m;
  }, [posts]);

  const orphaned = useMemo(
    () => posts.filter((p) => p.cluster_id == null),
    [posts],
  );

  function startNew() {
    setEditing({
      id: 0,
      project_id: defaultProjectId,
      name: "",
      pillar_keyword: null,
      description: null,
      color: "slate",
      created_at: null,
      updated_at: null,
    });
    setShowForm(true);
  }

  async function handleSave(input: TopicClusterInput) {
    await onSaveCluster(editing && editing.id > 0 ? editing : null, input);
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Group planned posts under a pillar topic. Clusters give you a
          hub-and-spoke view of your content plan and are the unit phase 3's
          brief generator will reason over.
        </p>
        <button
          type="button"
          onClick={startNew}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          + New cluster
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : clusters.length === 0 ? (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          No clusters yet. Create one to start grouping posts under a pillar
          topic.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clusters.map((c) => {
            const items = postsByCluster.get(c.id) ?? [];
            const bar =
              COLOR_BAR[c.color ?? "slate"] ?? COLOR_BAR.slate;
            return (
              <article
                key={c.id}
                className={`flex flex-col gap-2 rounded border-l-4 border bg-white p-3 shadow-sm ${bar}`}
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">{c.name}</h4>
                    {c.pillar_keyword && (
                      <p className="font-mono text-xs text-slate-500">
                        → {c.pillar_keyword}
                      </p>
                    )}
                    {c.description && (
                      <p className="mt-1 text-xs text-slate-600">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(c);
                        setShowForm(true);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete cluster "${c.name}"? Posts in it will be unlinked but kept.`,
                          )
                        ) {
                          void onDeleteCluster(c);
                        }
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </header>
                <div className="text-xs text-slate-500">
                  {items.length} post{items.length === 1 ? "" : "s"}
                </div>
                {items.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {items.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => onEditPost(p)}
                          className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-slate-50"
                        >
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              STATUS_COLORS[p.status as Status] ??
                              STATUS_COLORS.idea
                            }`}
                          >
                            {p.status}
                          </span>
                          <span className="truncate">{p.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}

      {orphaned.length > 0 && (
        <div className="rounded border bg-white">
          <h4 className="border-b px-3 py-2 text-sm font-semibold">
            Unclustered posts{" "}
            <span className="font-normal text-slate-500">
              ({orphaned.length})
            </span>
          </h4>
          <ul className="divide-y">
            {orphaned.map((p) => (
              <li key={p.id} className="px-3 py-2 text-sm">
                <button
                  type="button"
                  onClick={() => onEditPost(p)}
                  className="flex w-full items-center gap-2 text-left hover:underline"
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      STATUS_COLORS[p.status as Status] ?? STATUS_COLORS.idea
                    }`}
                  >
                    {p.status}
                  </span>
                  <span>{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && editing && (
        <ClusterForm
          cluster={editing}
          busy={busy}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ClusterForm({
  cluster,
  busy,
  onSave,
  onCancel,
}: {
  cluster: TopicCluster;
  busy: boolean;
  onSave: (input: TopicClusterInput) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(cluster.name);
  const [pillar, setPillar] = useState(cluster.pillar_keyword ?? "");
  const [description, setDescription] = useState(cluster.description ?? "");
  const [color, setColor] = useState(cluster.color ?? "slate");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    void onSave({
      project_id: cluster.project_id,
      name: name.trim(),
      pillar_keyword: pillar.trim() || null,
      description: description.trim() || null,
      color,
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
          {cluster.id > 0 ? "Edit cluster" : "New cluster"}
        </h3>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            required
            autoFocus
            className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
            placeholder="Local SEO"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Pillar keyword</span>
          <input
            type="text"
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
            disabled={busy}
            className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
            placeholder="local seo"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            className="h-16 rounded border px-2 py-1 text-sm disabled:bg-slate-50"
            placeholder="What this cluster is for…"
          />
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Color</span>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                aria-label={`Color ${c.id}`}
                aria-pressed={color === c.id}
                className={`h-6 w-6 rounded-full border ${c.swatch} ${
                  color === c.id
                    ? "ring-2 ring-slate-800 ring-offset-1"
                    : "border-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
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
            disabled={busy || !name.trim()}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
