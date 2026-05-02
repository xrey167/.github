import { useState } from "react";

import BulkTab from "./serp/BulkTab";
import QuickTab from "./serp/QuickTab";

const TABS = [
  { id: "quick", label: "Quick (Live)" },
  { id: "bulk", label: "Bulk (Standard Queue)" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SerpPage() {
  const [active, setActive] = useState<TabId>("quick");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">SERP</h2>
        <p className="text-sm text-slate-600">
          Live single-keyword check or bulk Standard-Queue tasks. Bulk results stream into the Tasks page as the
          background poller fetches them.
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

      {active === "quick" && <QuickTab />}
      {active === "bulk" && <BulkTab />}
    </section>
  );
}
