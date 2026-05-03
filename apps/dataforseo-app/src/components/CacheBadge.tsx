interface Props {
  fromCache: boolean;
  fetchedAt: string | null;
}

/// Renders nothing for fresh API responses; for cached responses, shows a
/// small "cached · 3h ago" pill so the user knows whether the call cost
/// anything. The Refresh (↻) button next to Run lets them force a refetch.
export default function CacheBadge({ fromCache, fetchedAt }: Props) {
  if (!fromCache) return null;
  return (
    <span
      className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800"
      title={fetchedAt ? `Fetched at ${fetchedAt}` : undefined}
    >
      cached{fetchedAt ? ` · ${formatRelative(fetchedAt)}` : ""}
    </span>
  );
}

/// Compact relative time: "3m ago" / "2h ago" / "5d ago". Anything older
/// falls back to the YYYY-MM-DD portion to keep the badge short.
function formatRelative(iso: string): string {
  // DuckDB writes "YYYY-MM-DD HH:MM:SS" UTC. Normalize to ISO so Date()
  // doesn't fall back to the local timezone parse path.
  const parsed = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const ms = Date.now() - parsed.getTime();
  if (!Number.isFinite(ms) || ms < 0) return iso.slice(0, 10);
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return iso.slice(0, 10);
}
