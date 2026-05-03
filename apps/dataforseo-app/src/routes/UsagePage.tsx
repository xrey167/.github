import { useState } from "react";

import AiTab from "./usage/AiTab";
import DataforseoTab from "./usage/DataforseoTab";

const TABS = [
  { id: "dataforseo", label: "DataForSEO" },
  { id: "ai", label: "AI Chat" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function UsagePage() {
  const [active, setActive] = useState<TabId>("dataforseo");
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Usage</h2>
        <p className="text-sm text-slate-600">
          Spend audit. DataForSEO API and AI provider calls are tracked
          separately so you can see where the money is going.
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

      {active === "dataforseo" && <DataforseoTab />}
      {active === "ai" && <AiTab />}
    </section>
  );
}
