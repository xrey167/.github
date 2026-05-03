import { useState } from "react";

import InstantPageTab from "./on_page/InstantPageTab";
import LighthouseTab from "./on_page/LighthouseTab";

const TABS = [
  { id: "instant", label: "Instant Page Audit" },
  { id: "lighthouse", label: "Lighthouse" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function OnPagePage() {
  const [active, setActive] = useState<TabId>("instant");
  const [url, setUrl] = useState("");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">On-Page</h2>
        <p className="text-sm text-slate-600">
          Single-page audits without spinning up a full crawl. Instant Pages covers ~70 SEO
          checks; Lighthouse runs Google's performance / accessibility / best-practices / SEO scoring.
        </p>
      </header>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="rounded border px-2 py-1 font-mono text-sm"
          placeholder="https://example.com/landing"
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      <nav className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors ${
              active === tab.id
                ? "border-slate-800 font-medium text-slate-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {active === "instant" && <InstantPageTab url={url} />}
      {active === "lighthouse" && <LighthouseTab url={url} />}
    </section>
  );
}
