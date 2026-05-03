import { useState } from "react";
import toast from "react-hot-toast";

import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../lib/constants";
import { useProject } from "../lib/project-store";
import { tauriApi } from "../lib/tauri";

type ActiveModal = "track" | "audit" | "brand" | null;

interface Props {
  /// Pre-filled keyword for Track / Brand modals. Empty when the
  /// quick actions hang off a domain row (e.g. SerpCompetitorsTab).
  keyword?: string;
  /// Pre-filled URL for the Audit modal. Falls back to the project
  /// target if absent.
  url?: string;
  /// Compact mode renders icon-only 24×24 buttons (for table rows).
  /// Default mode renders labelled buttons (for tile / detail views).
  compact?: boolean;
}

/// Three contextual one-click follow-ups for any result row:
/// 📊 Track keyword (adds to /tracking)
/// 🔍 Audit page (kicks off /audit on the URL)
/// 🏢 Brand monitor (creates a brand-search snapshot for the keyword)
///
/// Each opens a tiny modal with the relevant fields pre-filled from
/// either the props or the active project. The user can edit the
/// pre-fill before confirming.
export default function QuickActions({ keyword = "", url = "", compact = false }: Props) {
  const [active, setActive] = useState<ActiveModal>(null);
  // Pull the active project's target so Audit / Track default sensibly
  // when the caller doesn't supply one.
  const { active: activeProject } = useProject();

  const sizeClass = compact ? "px-1 py-0 text-xs" : "px-2 py-1 text-sm";
  const labelOrIcon = (icon: string, label: string) =>
    compact ? icon : `${icon} ${label}`;

  return (
    <>
      <span className="inline-flex gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActive("track");
          }}
          className={`rounded border border-slate-300 ${sizeClass} text-slate-700 hover:bg-slate-50`}
          title="Track this keyword's position daily"
        >
          {labelOrIcon("📊", "Track")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActive("audit");
          }}
          className={`rounded border border-slate-300 ${sizeClass} text-slate-700 hover:bg-slate-50`}
          title="Run a Site Audit on this page"
        >
          {labelOrIcon("🔍", "Audit")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActive("brand");
          }}
          className={`rounded border border-slate-300 ${sizeClass} text-slate-700 hover:bg-slate-50`}
          title="Track mentions of this term across the open web"
        >
          {labelOrIcon("🏢", "Brand")}
        </button>
      </span>

      {active === "track" && (
        <TrackModal
          initialKeyword={keyword}
          initialTarget={activeProject?.target ?? ""}
          onClose={() => setActive(null)}
        />
      )}
      {active === "audit" && (
        <AuditModal
          // Don't blindly prepend https:// — the project target field
          // accepts either a bare domain or a full URL, so re-prefixing
          // a stored "https://example.com" would produce
          // "https://https://example.com".
          initialUrl={
            url ||
            (activeProject?.target
              ? activeProject.target.startsWith("http")
                ? activeProject.target
                : `https://${activeProject.target}`
              : "")
          }
          onClose={() => setActive(null)}
        />
      )}
      {active === "brand" && (
        <BrandModal initialKeyword={keyword} onClose={() => setActive(null)} />
      )}
    </>
  );
}

// ---------- Track modal ----------

function TrackModal({
  initialKeyword,
  initialTarget,
  onClose,
}: {
  initialKeyword: string;
  initialTarget: string;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "manual">("daily");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!target.trim() || !keyword.trim()) return;
    setBusy(true);
    try {
      await tauriApi.trackingAdd({
        target: target.trim(),
        keyword: keyword.trim(),
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        frequency,
      });
      toast.success(`Tracking "${keyword.trim()}" for ${target.trim()}`);
      onClose();
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="📊 Track keyword" onClose={onClose} busy={busy}>
      <Field
        label="Target domain"
        value={target}
        onChange={setTarget}
        placeholder="example.com"
        disabled={busy}
      />
      <Field
        label="Keyword"
        value={keyword}
        onChange={setKeyword}
        placeholder="seo tools"
        disabled={busy}
      />
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-slate-600">Frequency</span>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          disabled={busy}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="manual">Manual only</option>
        </select>
      </label>
      <ModalActions
        busy={busy}
        disabled={!target.trim() || !keyword.trim()}
        submitLabel={busy ? "Adding…" : "Track"}
        onSubmit={submit}
        onClose={onClose}
      />
    </ModalShell>
  );
}

// ---------- Audit modal ----------

function AuditModal({
  initialUrl,
  onClose,
}: {
  initialUrl: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [maxPages, setMaxPages] = useState(100);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const id = await tauriApi.auditStart({
        target: url.trim(),
        maxCrawlPages: maxPages,
      });
      toast.success(`Audit #${id} queued for ${url.trim()}`);
      onClose();
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="🔍 Site audit" onClose={onClose} busy={busy}>
      <Field
        label="Target"
        value={url}
        onChange={setUrl}
        placeholder="https://example.com"
        disabled={busy}
      />
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-slate-600">Max pages to crawl ({maxPages})</span>
        <select
          value={maxPages}
          onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
          disabled={busy}
          className="rounded border px-2 py-1 text-sm"
        >
          {[50, 100, 200, 500, 1000].map((n) => (
            <option key={n} value={n}>
              {n} pages · {(n * 0.000125).toFixed(4)} USD
            </option>
          ))}
        </select>
      </label>
      <ModalActions
        busy={busy}
        disabled={!url.trim()}
        submitLabel={busy ? "Starting…" : "Start audit"}
        onSubmit={submit}
        onClose={onClose}
      />
    </ModalShell>
  );
}

// ---------- Brand modal ----------

function BrandModal({
  initialKeyword,
  onClose,
}: {
  initialKeyword: string;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!keyword.trim()) return;
    setBusy(true);
    try {
      const result = await tauriApi.brandSearch({
        keyword: keyword.trim(),
        limit,
        positiveKeywords: [],
        negativeKeywords: [],
        useCache: true,
      });
      toast.success(
        `${result.items_count} mentions for "${keyword.trim()}"${
          result.from_cache ? " (cached)" : ""
        }`,
      );
      onClose();
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="🏢 Brand monitor" onClose={onClose} busy={busy}>
      <Field
        label="Brand or keyword"
        value={keyword}
        onChange={setKeyword}
        placeholder="my brand"
        disabled={busy}
      />
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-slate-600">Mention limit ({limit})</span>
        <input
          type="number"
          min={10}
          max={1000}
          step={10}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 50)}
          disabled={busy}
          className="rounded border px-2 py-1 text-sm"
        />
      </label>
      <p className="text-xs text-slate-500">
        Cost: {(limit * 0.001).toFixed(3)} USD ({limit} mentions × 0.001 USD/row), 0 if cached.
        For richer analysis open the Brand Monitor page directly.
      </p>
      <ModalActions
        busy={busy}
        disabled={!keyword.trim()}
        submitLabel={busy ? "Searching…" : "Search mentions"}
        onSubmit={submit}
        onClose={onClose}
      />
    </ModalShell>
  );
}

// ---------- Shared modal primitives ----------

function ModalShell({
  title,
  onClose,
  children,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /// When true, swallow backdrop clicks and disable the × button.
  /// Prevents the user from dismissing the modal mid-request, which
  /// would hide the eventual success/failure toast and tempt them
  /// into firing the same action again.
  busy?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded border bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
      />
    </label>
  );
}

function ModalActions({
  busy,
  disabled,
  submitLabel,
  onSubmit,
  onClose,
}: {
  busy: boolean;
  disabled: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || busy}
        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
