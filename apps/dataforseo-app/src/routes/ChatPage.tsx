import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import MarkdownView from "../components/MarkdownView";
import { downloadJson, downloadMarkdown, timestampedFilename } from "../lib/export";
import { formatUsd } from "../lib/format";
import {
  tauriApi,
  type ChatSession,
  type PromptTemplate,
  type StoredChatMessage,
} from "../lib/tauri";

export default function ChatPage() {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  // Number("abc") returns NaN — guard so a junk URL like /chat/foo doesn't
  // fall through to API calls with an invalid id.
  const parsed = params.sessionId ? Number(params.sessionId) : null;
  const sessionId = parsed != null && Number.isFinite(parsed) ? parsed : null;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await tauriApi.chatListSessions({ limit: 50 }));
    } catch (e) {
      toast.error(`Sessions: ${(e as { message?: string })?.message ?? e}`);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    tauriApi
      .aiPromptTemplates()
      .then(setTemplates)
      .catch((e) => toast.error(`Templates: ${(e as { message?: string })?.message ?? e}`));
    tauriApi
      .aiProviderStatus()
      .then((statuses) => setProviderConfigured(statuses.some((s) => s.configured)))
      .catch(() => setProviderConfigured(false));
  }, [refreshSessions]);

  useEffect(() => {
    if (sessionId == null) {
      setActiveSession(null);
      setMessages([]);
      return;
    }
    setBusy(true);
    Promise.all([
      tauriApi.chatHistory({ sessionId }),
      tauriApi.chatListSessions({ limit: 50 }).then((list) =>
        list.find((s) => s.id === sessionId) ?? null,
      ),
    ])
      .then(([history, session]) => {
        setMessages(history);
        setActiveSession(session);
      })
      .catch((e) => toast.error(`Load session: ${(e as { message?: string })?.message ?? e}`))
      .finally(() => setBusy(false));
  }, [sessionId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function startBlankSession() {
    if (providerConfigured === false) {
      toast.error("Anthropic key not set — open Settings to configure.");
      return;
    }
    try {
      const id = await tauriApi.chatNewSession({
        attachmentSummary: null,
        attachmentJson: null,
      });
      navigate(`/chat/${id}`);
      await refreshSessions();
    } catch (e) {
      toast.error(`New session: ${(e as { message?: string })?.message ?? e}`);
    }
  }

  async function send(userContent: string, templateId: string | null) {
    if (!sessionId || !userContent.trim()) return;
    const optimistic: StoredChatMessage = {
      id: -Date.now(),
      session_id: sessionId,
      role: "user",
      content: userContent,
      prompt_template_id: templateId,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      created_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setBusy(true);
    try {
      const assistant = await tauriApi.chatSend({
        sessionId,
        userContent,
        promptTemplateId: templateId,
      });
      // Re-pull the canonical history so optimistic + assistant land in
      // the right ids/timestamps.
      const fresh = await tauriApi.chatHistory({ sessionId });
      setMessages(fresh);
      if (assistant.cost_usd != null) {
        toast.success(`+${formatUsd(assistant.cost_usd)}`);
      }
      await refreshSessions();
    } catch (e) {
      toast.error(`Send: ${(e as { message?: string })?.message ?? e}`);
      // Rollback the optimistic message — chat_send persists the user
      // turn before the API call, so a fresh history pull is the source
      // of truth even on failure.
      try {
        setMessages(await tauriApi.chatHistory({ sessionId }));
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full flex-col gap-4">
      <header>
        <h2 className="text-xl font-semibold">Chat</h2>
        <p className="text-sm text-slate-600">
          Cluster keywords, draft titles, ask anything about your DataForSEO results.
          Sessions persist locally; cost is recorded per call.
        </p>
        {providerConfigured === false && (
          <div className="mt-2 rounded border bg-amber-50 p-2 text-sm text-amber-800">
            No AI provider configured.{" "}
            <Link to="/settings" className="underline">
              Add an Anthropic API key in Settings
            </Link>{" "}
            to start chatting.
          </div>
        )}
      </header>

      <div className="grid h-full grid-cols-[260px_1fr] gap-4 overflow-hidden">
        <SessionsSidebar
          sessions={sessions}
          activeId={sessionId}
          onNew={startBlankSession}
          disabled={providerConfigured === false}
        />
        <div className="flex h-full flex-col gap-3 overflow-hidden">
          {!activeSession && (
            <div className="flex h-full items-center justify-center rounded border bg-white text-sm text-slate-500">
              Pick a session on the left, or click &ldquo;Chat with results&rdquo; on any
              table to start a new one with an attachment.
            </div>
          )}
          {activeSession && (
            <>
              <SessionHeader session={activeSession} messages={messages} />
              <ChatThread threadRef={threadRef} messages={messages} busy={busy} />
              <ChatInput
                templates={templates}
                disabled={busy || providerConfigured === false}
                onSubmit={send}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SessionsSidebar({
  sessions,
  activeId,
  onNew,
  disabled,
}: {
  sessions: ChatSession[];
  activeId: number | null;
  onNew: () => void;
  disabled: boolean;
}) {
  return (
    <aside className="flex h-full flex-col gap-2 overflow-hidden">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        + New session
      </button>
      <div className="flex-1 overflow-y-auto rounded border bg-white">
        {sessions.length === 0 && (
          <div className="p-3 text-xs text-slate-500">No sessions yet.</div>
        )}
        {sessions.map((s) => (
          <Link
            key={s.id}
            to={`/chat/${s.id}`}
            className={`block border-b px-3 py-2 text-sm hover:bg-slate-50 ${
              activeId === s.id ? "bg-slate-100" : ""
            }`}
          >
            <div className="truncate font-medium">{s.title ?? s.attachment_summary ?? "Untitled"}</div>
            <div className="truncate text-xs text-slate-500">
              {s.provider}/{s.model} · {s.updated_at?.slice(0, 16) ?? ""}
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function SessionHeader({
  session,
  messages,
}: {
  session: ChatSession;
  messages: StoredChatMessage[];
}) {
  function exportMarkdown() {
    const stem = `chat-${session.title ?? session.id}`;
    downloadMarkdown(threadToMarkdown(session, messages), timestampedFilename(stem, "md"));
  }
  function exportJson() {
    const stem = `chat-${session.title ?? session.id}`;
    downloadJson(messages, timestampedFilename(stem, "json"));
  }
  return (
    <div className="flex items-start justify-between rounded border bg-slate-50 p-2 text-xs text-slate-600">
      <div>
        {session.attachment_summary && (
          <div>
            📎 <strong>Attached:</strong> {session.attachment_summary}
          </div>
        )}
        <div>
          {session.provider} · {session.model}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={exportMarkdown}
          disabled={messages.length === 0}
          className="rounded border bg-white px-2 py-0.5 text-xs disabled:opacity-50"
          title="Download the thread as a Markdown file"
        >
          Export .md
        </button>
        <button
          type="button"
          onClick={exportJson}
          disabled={messages.length === 0}
          className="rounded border bg-white px-2 py-0.5 text-xs disabled:opacity-50"
          title="Download the raw message history as JSON"
        >
          .json
        </button>
      </div>
    </div>
  );
}

function threadToMarkdown(session: ChatSession, messages: StoredChatMessage[]): string {
  const lines: string[] = [];
  lines.push(`# Chat — ${session.title ?? `session ${session.id}`}`);
  lines.push(`*${session.provider} · ${session.model}*`);
  if (session.attachment_summary) {
    lines.push(`*Attached:* ${session.attachment_summary}`);
  }
  lines.push("");
  for (const m of messages) {
    if (m.role === "system") continue; // system isn't a turn the user authored
    const heading = m.role === "user" ? "**You**" : "**Assistant**";
    lines.push(`---`);
    lines.push("");
    lines.push(heading);
    lines.push("");
    lines.push(m.content);
    if (m.cost_usd != null) {
      lines.push("");
      lines.push(
        `*${m.input_tokens ?? 0}+${m.output_tokens ?? 0} tok · ${formatUsd(m.cost_usd)}*`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

// `ref` is reserved on functional components in React 18 unless wrapped in
// forwardRef — using a custom prop name skips the wrapper and lets the auto-
// scroll effect target the underlying div.
const ChatThread = ({
  messages,
  busy,
  threadRef,
}: {
  messages: StoredChatMessage[];
  busy: boolean;
  threadRef?: React.RefObject<HTMLDivElement>;
}) => (
  <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto rounded border bg-white p-4">
    {messages.length === 0 && (
      <div className="text-sm text-slate-500">No messages yet — try a Quick Action below.</div>
    )}
    {messages.map((m) => (
      <MessageBubble key={m.id} message={m} />
    ))}
    {busy && <div className="text-xs text-slate-500">Thinking…</div>}
  </div>
);

function MessageBubble({ message }: { message: StoredChatMessage }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded px-3 py-2 text-sm ${
          isUser
            ? "bg-slate-800 text-white whitespace-pre-wrap"
            : isAssistant
              ? "bg-slate-100 text-slate-900"
              : "bg-amber-50 text-amber-900 text-xs whitespace-pre-wrap"
        }`}
      >
        {/* Render assistant turns as Markdown — headings, lists, code, tables.
            User turns stay plain so a stray ** doesn't render as bold against
            the user's intent. */}
        {isAssistant ? (
          <MarkdownView content={message.content} />
        ) : (
          message.content
        )}
        {message.cost_usd != null && (
          <div className="mt-1 text-[10px] opacity-60">
            {message.input_tokens}+{message.output_tokens} tok · {formatUsd(message.cost_usd)}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatInput({
  templates,
  disabled,
  onSubmit,
}: {
  templates: PromptTemplate[];
  disabled: boolean;
  onSubmit: (content: string, templateId: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  function submit() {
    if (!text.trim()) return;
    onSubmit(text, templateId);
    setText("");
  }

  function applyTemplate(t: PromptTemplate) {
    setTemplateId(t.id);
    if (!text.trim()) {
      setText(t.description);
    }
  }

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templateId, templates],
  );

  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Quick actions:</span>
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTemplate(t)}
            disabled={disabled}
            className={`rounded border px-2 py-0.5 text-xs disabled:opacity-50 ${
              templateId === t.id ? "border-slate-800 bg-slate-100" : "hover:bg-slate-50"
            }`}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
        {templateId && (
          <button
            type="button"
            onClick={() => setTemplateId(null)}
            className="text-xs text-slate-500 hover:underline"
          >
            clear template
          </button>
        )}
      </div>
      {selected && (
        <div className="mb-2 text-xs text-slate-500 italic">{selected.description}</div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        disabled={disabled}
        placeholder="Ask the assistant — Cmd/Ctrl+Enter to send"
        className="w-full resize-y rounded border px-2 py-1 text-sm disabled:bg-slate-50"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
