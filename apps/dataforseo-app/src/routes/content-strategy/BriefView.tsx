import { useState } from "react";
import toast from "react-hot-toast";

import MarkdownView from "../../components/MarkdownView";
import { formatError } from "../../lib/errors";
import { formatUsd } from "../../lib/format";
import {
  tauriApi,
  type ContentBrief,
  type PlannedPost,
} from "../../lib/tauri";

interface Props {
  post: PlannedPost;
  onClose: () => void;
  /// Called after a successful (re)generation so the parent can refresh
  /// its post list and pick up the persisted brief.
  onGenerated: () => void | Promise<void>;
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export default function BriefView({ post, onClose, onGenerated }: Props) {
  const [busy, setBusy] = useState(false);
  // Local state holds the just-generated brief so we render fresh content
  // before the parent's refresh round-trip lands.
  const [latest, setLatest] = useState<ContentBrief | null>(null);

  const briefMd = latest?.brief_md ?? post.brief_md ?? "";
  const model = latest?.model ?? post.brief_model ?? null;
  const generatedAt = latest
    ? new Date().toISOString()
    : post.brief_generated_at;

  async function generate() {
    setBusy(true);
    try {
      const result = await tauriApi.contentBriefGenerate({ postId: post.id });
      setLatest(result);
      toast.success(
        `Brief generated (${result.model}, ${formatUsd(result.cost_usd)})`,
      );
      await onGenerated();
    } catch (e) {
      toast.error(formatError(e, "Generate brief"));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!briefMd) return;
    try {
      await navigator.clipboard.writeText(briefMd);
      toast.success("Brief copied as Markdown");
    } catch (e) {
      toast.error(formatError(e, "Copy"));
    }
  }

  function downloadMd() {
    if (!briefMd) return;
    const safeTitle = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const blob = new Blob([briefMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle || "brief"}-brief.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasBrief = briefMd.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded border bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">Content brief</h3>
            <p className="text-xs text-slate-500">{post.title}</p>
            {hasBrief && (
              <p className="mt-1 text-[11px] text-slate-500">
                {model && <span className="font-mono">{model}</span>} ·
                generated {formatTimestamp(generatedAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {busy ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Generating brief… this usually takes 10-30 seconds.
            </p>
          ) : hasBrief ? (
            <MarkdownView content={briefMd} />
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              No brief yet. Click <strong>Generate</strong> to draft one with
              the active AI provider. Requires an API key configured in
              Settings.
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {busy ? "Generating…" : hasBrief ? "Regenerate" : "Generate"}
            </button>
            {hasBrief && (
              <>
                <button
                  type="button"
                  onClick={copy}
                  disabled={busy}
                  className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadMd}
                  disabled={busy}
                  className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Download .md
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
