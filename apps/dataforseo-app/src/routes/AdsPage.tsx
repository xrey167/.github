import { useMemo, useState } from "react";

interface Library {
  id: string;
  name: string;
  description: string;
  searchUrl: (target: string) => string;
  freeData: boolean;
}

const LIBRARIES: Library[] = [
  {
    id: "google",
    name: "Google Ads Transparency Center",
    description:
      "Every Google Ads advertiser's running creatives, dates, and serving regions. The biggest ad library by volume.",
    searchUrl: (target) =>
      `https://adstransparency.google.com/?region=anywhere&domain=${encodeURIComponent(target)}`,
    freeData: true,
  },
  {
    id: "meta",
    name: "Meta Ad Library",
    description:
      "Facebook and Instagram active ads. Full creatives + impression bands + spend bands (in EU since DSA).",
    searchUrl: (target) =>
      `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
        target,
      )}&search_type=keyword_unordered`,
    freeData: true,
  },
  {
    id: "tiktok",
    name: "TikTok Creative Center",
    description:
      "Top-performing TikTok ads by industry and region. Less granular per-advertiser data than Google or Meta.",
    searchUrl: (target) =>
      `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?keyword=${encodeURIComponent(target)}`,
    freeData: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn Ad Library",
    description:
      "LinkedIn paid creatives by company page. Useful for B2B competitor intelligence.",
    searchUrl: (target) =>
      `https://www.linkedin.com/ad-library/search?keyword=${encodeURIComponent(target)}`,
    freeData: true,
  },
];

export default function AdsPage() {
  const [target, setTarget] = useState("");
  const trimmed = target.trim();

  // Sanity-check the input — strip protocol so the user can paste a URL.
  const cleanTarget = useMemo(() => {
    if (!trimmed) return "";
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }, [trimmed]);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Ad libraries</h2>
        <p className="text-sm text-slate-600">
          PPC competitor intelligence from the public ad transparency
          archives. SEMrush charges Pro+ for a slice of this data; the
          underlying libraries themselves are free, public, and structured —
          we just open them for you with the search prefilled.
        </p>
      </header>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Domain or company</span>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded border px-2 py-1 font-mono text-sm"
          placeholder="example.com or 'Acme Inc'"
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {LIBRARIES.map((lib) => (
          <div key={lib.id} className="rounded border bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">{lib.name}</h3>
            <p className="mt-1 text-xs text-slate-600">{lib.description}</p>
            <a
              href={cleanTarget ? lib.searchUrl(cleanTarget) : "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!cleanTarget) e.preventDefault();
              }}
              className={`mt-3 inline-block rounded px-3 py-1.5 text-xs ${
                cleanTarget
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              Search {lib.name} →
            </a>
          </div>
        ))}
      </div>

      <div className="rounded border bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Why deep-links instead of scraping?</strong> Each ad library has
        anti-scraping measures and changing internal endpoints. A deep link is
        100% reliable, opens the official UI with full features (filters,
        date ranges, image previews), and never breaks. A future PR can add
        an inline scraper for Google Ads Transparency Center — its endpoint
        is the most stable — once the user-flow validates this surface.
      </div>
    </section>
  );
}
