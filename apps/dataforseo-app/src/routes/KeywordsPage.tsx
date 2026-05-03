import { useState } from "react";

import BulkVolumeTab from "./keywords/BulkVolumeTab";
import DifficultyTab from "./keywords/DifficultyTab";
import KeywordOverviewTab from "./keywords/KeywordOverviewTab";
import RelatedTab from "./keywords/RelatedTab";
import SerpCompetitorsTab from "./keywords/SerpCompetitorsTab";
import SuggestionsTab from "./keywords/SuggestionsTab";
import VolumeTab from "./keywords/VolumeTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "volume", label: "Volume" },
  { id: "bulk_volume", label: "Bulk Volume (cheap)" },
  { id: "suggestions", label: "Suggestions" },
  { id: "related", label: "Related" },
  { id: "difficulty", label: "Difficulty" },
  { id: "serp_competitors", label: "SERP Competitors" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function KeywordsPage() {
  const [active, setActive] = useState<TabId>("volume");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Keywords</h2>
        <p className="text-sm text-slate-600">
          Volume from Google Ads, plus Suggestions and Related from DataForSEO Labs.
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

      {active === "overview" && <KeywordOverviewTab />}
      {active === "volume" && <VolumeTab />}
      {active === "bulk_volume" && <BulkVolumeTab />}
      {active === "suggestions" && <SuggestionsTab />}
      {active === "related" && <RelatedTab />}
      {active === "difficulty" && <DifficultyTab />}
      {active === "serp_competitors" && <SerpCompetitorsTab />}
    </section>
  );
}
