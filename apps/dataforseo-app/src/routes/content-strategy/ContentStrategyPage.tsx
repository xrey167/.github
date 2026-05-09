import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../../lib/errors";
import { useProject } from "../../lib/project-store";
import {
  tauriApi,
  type PlannedPost,
  type PlannedPostInput,
  type TopicCluster,
  type TopicClusterInput,
} from "../../lib/tauri";

import BriefView from "./BriefView";
import CalendarTab from "./CalendarTab";
import ClustersTab from "./ClustersTab";
import GapTab from "./GapTab";
import PostForm from "./PostForm";

type Tab = "calendar" | "clusters" | "gap";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "calendar", label: "Calendar", description: "Editorial calendar" },
  { id: "clusters", label: "Clusters", description: "Topic groups" },
  { id: "gap", label: "Content Gap", description: "Competitor → plan" },
];

export default function ContentStrategyPage() {
  const { active: project } = useProject();

  const [tab, setTab] = useState<Tab>("calendar");
  const [posts, setPosts] = useState<PlannedPost[]>([]);
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingPost, setEditingPost] = useState<PlannedPost | null>(null);
  const [briefingPost, setBriefingPost] = useState<PlannedPost | null>(null);

  const refreshPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const list = await tauriApi.plannedPostsList({
        projectId: project?.id ?? null,
      });
      setPosts(list);
    } catch (e) {
      toast.error(formatError(e, "Planned posts"));
    } finally {
      setLoadingPosts(false);
    }
  }, [project?.id]);

  const refreshClusters = useCallback(async () => {
    setLoadingClusters(true);
    try {
      const list = await tauriApi.topicClustersList({
        projectId: project?.id ?? null,
      });
      setClusters(list);
    } catch (e) {
      toast.error(formatError(e, "Clusters"));
    } finally {
      setLoadingClusters(false);
    }
  }, [project?.id]);

  useEffect(() => {
    void refreshPosts();
    void refreshClusters();
  }, [refreshPosts, refreshClusters]);

  // Save a planned post — `existing` is null for create, the row for update.
  async function savePost(
    existing: PlannedPost | null,
    input: PlannedPostInput,
  ) {
    setBusy(true);
    try {
      if (existing) {
        await tauriApi.plannedPostsUpdate({ id: existing.id, input });
        toast.success("Post updated");
      } else {
        await tauriApi.plannedPostsCreate({ input });
        toast.success("Post added");
      }
      await refreshPosts();
    } catch (e) {
      toast.error(formatError(e, "Save"));
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(post: PlannedPost) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    setBusy(true);
    try {
      await tauriApi.plannedPostsDelete({ id: post.id });
      toast.success("Post deleted");
      await refreshPosts();
    } catch (e) {
      toast.error(formatError(e, "Delete"));
    } finally {
      setBusy(false);
    }
  }

  async function saveCluster(
    existing: TopicCluster | null,
    input: TopicClusterInput,
  ) {
    setBusy(true);
    try {
      if (existing) {
        await tauriApi.topicClustersUpdate({ id: existing.id, input });
        toast.success("Cluster updated");
      } else {
        await tauriApi.topicClustersCreate({ input });
        toast.success("Cluster added");
      }
      await refreshClusters();
    } catch (e) {
      toast.error(formatError(e, "Save cluster"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteCluster(cluster: TopicCluster) {
    setBusy(true);
    try {
      await tauriApi.topicClustersDelete({ id: cluster.id });
      toast.success("Cluster deleted");
      // Posts may have lost their cluster_id — refresh both.
      await Promise.all([refreshClusters(), refreshPosts()]);
    } catch (e) {
      toast.error(formatError(e, "Delete cluster"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Content Strategy</h2>
        <p className="text-sm text-slate-600">
          Plan posts on a calendar, group them into topic clusters, and
          discover keyword gaps from competitors. Phase 3 will add an LLM
          brief generator.
        </p>
        {project && (
          <p className="mt-1 text-xs text-slate-500">
            Project: <strong>{project.name}</strong> ({project.target})
          </p>
        )}
      </header>

      <nav className="flex border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t.id
                ? "border-slate-800 font-semibold text-slate-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "calendar" && (
        <CalendarTab
          posts={posts}
          clusters={clusters}
          loading={loadingPosts}
          busy={busy}
          defaultProjectId={project?.id ?? null}
          onSave={savePost}
          onDelete={deletePost}
          onOpenBrief={(p) => setBriefingPost(p)}
        />
      )}

      {tab === "clusters" && (
        <ClustersTab
          clusters={clusters}
          posts={posts}
          loading={loadingClusters}
          busy={busy}
          defaultProjectId={project?.id ?? null}
          onSaveCluster={saveCluster}
          onDeleteCluster={deleteCluster}
          onEditPost={(p) => setEditingPost(p)}
        />
      )}

      {tab === "gap" && (
        <GapTab
          clusters={clusters}
          defaultProjectId={project?.id ?? null}
          defaultDomain={project?.target}
          onAddPost={async (input) => {
            await savePost(null, input);
          }}
        />
      )}

      {/* Cross-tab post editor — opened from ClustersTab "edit post" links */}
      {editingPost && (
        <PostForm
          post={editingPost}
          clusters={clusters}
          busy={busy}
          onSave={async (input) => {
            await savePost(editingPost.id > 0 ? editingPost : null, input);
            setEditingPost(null);
          }}
          onDelete={
            editingPost.id > 0
              ? async () => {
                  await deletePost(editingPost);
                  setEditingPost(null);
                }
              : undefined
          }
          onCancel={() => setEditingPost(null)}
          onOpenBrief={
            editingPost.id > 0
              ? () => {
                  const target = editingPost;
                  setEditingPost(null);
                  setBriefingPost(target);
                }
              : undefined
          }
        />
      )}

      {briefingPost && (
        <BriefView
          // Re-resolve from the latest list so a regenerate completion
          // re-renders with the persisted timestamp + model.
          post={posts.find((p) => p.id === briefingPost.id) ?? briefingPost}
          onClose={() => setBriefingPost(null)}
          onGenerated={refreshPosts}
        />
      )}
    </section>
  );
}
