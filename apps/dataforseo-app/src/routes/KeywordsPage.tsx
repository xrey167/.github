import { useState } from "react";

import DifficultyTab from "./keywords/DifficultyTab";
import RelatedTab from "./keywords/RelatedTab";
import SuggestionsTab from "./keywords/SuggestionsTab";
import VolumeTab from "./keywords/VolumeTab";

const TABS = [
  { id: "volume", label: "Volume" },
  { id: "suggestions", label: "Suggestions" },
  { id: "related", label: "Related" },
  { id: "difficulty", label: "Difficulty" },
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

      {active === "volume" && <VolumeTab />}
      {active === "suggestions" && <SuggestionsTab />}
      {active === "related" && <RelatedTab />}
      {active === "difficulty" && <DifficultyTab />}
    </section>
  );
}
