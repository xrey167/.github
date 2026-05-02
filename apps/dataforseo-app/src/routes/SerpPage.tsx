import { useState } from "react";

import AdsTab from "./serp/AdsTab";
import BulkTab from "./serp/BulkTab";
import MapsTab from "./serp/MapsTab";
import NewsTab from "./serp/NewsTab";
import QuickTab from "./serp/QuickTab";

const TABS = [
  { id: "quick", label: "Organic" },
  { id: "ads", label: "Ads" },
  { id: "news", label: "News" },
  { id: "maps", label: "Maps" },
  { id: "bulk", label: "Bulk (Queue)" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SerpPage() {
  const [active, setActive] = useState<TabId>("quick");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">SERP</h2>
        <p className="text-sm text-slate-600">
          Live keyword SERP checks — organic, paid ads, news, and local maps. Bulk
          organic tasks run through the Standard Queue and stream into the Tasks page.
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
      {active === "ads" && <AdsTab />}
      {active === "news" && <NewsTab />}
      {active === "maps" && <MapsTab />}
      {active === "bulk" && <BulkTab />}
    </section>
  );
}
