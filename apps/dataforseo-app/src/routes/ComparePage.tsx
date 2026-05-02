import { useState } from "react";

import DomainsTab from "./compare/DomainsTab";
import KeywordsTab from "./compare/KeywordsTab";

const TABS = [
  { id: "keywords", label: "Keyword sets" },
  { id: "domains", label: "Domains" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ComparePage() {
  const [active, setActive] = useState<TabId>("keywords");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Compare</h2>
        <p className="text-sm text-slate-600">
          Set-vs-set diff, free of charge for the cache layer to do its job.
          Use Domains for keyword-gap analysis vs a competitor.
        </p>
      </header>

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

      {active === "keywords" && <KeywordsTab />}
      {active === "domains" && <DomainsTab />}
    </section>
  );
}
