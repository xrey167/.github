import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import MarkdownView from "../components/MarkdownView";
import { tauriApi, type StoredChatMessage } from "../lib/tauri";

export default function SocialPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<StoredChatMessage | null>(null);

  async function onDraft() {
    if (!topic.trim()) return;
    setBusy(true);
    try {
      // Reuse the AI chat infrastructure: create a fresh session, fire the
      // social_drafts template prompt, render the assistant turn here.
      const sessionId = await tauriApi.chatNewSession({
        attachmentSummary: null,
        attachmentJson: null,
      });
      const userContent = audience.trim()
        ? `Topic: ${topic}\nAudience: ${audience}`
        : `Topic: ${topic}`;
      const reply = await tauriApi.chatSend({
        sessionId,
        userContent,
        promptTemplateId: "social_drafts",
      });
      setDraft(reply);
      toast.success("Drafts ready");
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Social drafts</h2>
        <p className="text-sm text-slate-600">
          AI-drafted post variants for Twitter / LinkedIn / Instagram. We don't
          schedule or post on your behalf — copy the draft into Buffer, Later,
          Hootsuite, or post manually. Replicating a full social-media suite
          (scheduling, multi-account analytics) is the wrong fight; tools like
          Buffer at 6 USD per month already do that better than we ever will.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Topic</span>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={busy}
              rows={3}
              className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
              placeholder="What are you posting about? e.g. our new SEO tool launches today"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Audience (optional)</span>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={busy}
              className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
              placeholder="e.g. SEO consultants in DACH agencies"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded border bg-slate-50 p-3 text-xs text-slate-600">
            Uses the active AI provider. Cost shows up in /usage AI Chat.
          </div>
          <button
            type="button"
            onClick={onDraft}
            disabled={busy || !topic.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Drafting…" : "Draft posts"}
          </button>
        </div>
      </div>

      {draft && (
        <div className="rounded border bg-white p-4">
          <MarkdownView content={draft.content} />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              {draft.input_tokens}+{draft.output_tokens} tok ·{" "}
              {draft.cost_usd != null
                ? `$${draft.cost_usd.toFixed(4)}`
                : "—"}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/chat/${draft.session_id}`)}
              className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50"
            >
              Continue in chat
            </button>
          </div>
        </div>
      )}

      {!draft && !busy && (
        <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
          Enter a topic and click Draft posts to get three variants.
        </div>
      )}

      <div className="rounded border bg-slate-50 p-3 text-xs text-slate-600">
        <strong>Where to post:</strong>{" "}
        <a
          href="https://buffer.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Buffer
        </a>
        {" · "}
        <a
          href="https://later.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Later
        </a>
        {" · "}
        <a
          href="https://hootsuite.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Hootsuite
        </a>
      </div>
    </section>
  );
}
