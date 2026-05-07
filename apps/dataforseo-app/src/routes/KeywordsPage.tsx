import { useState } from "react";
import { useTranslation } from "react-i18next";

import BulkVolumeTab from "./keywords/BulkVolumeTab";
import DifficultyTab from "./keywords/DifficultyTab";
import KeywordOverviewTab from "./keywords/KeywordOverviewTab";
import RelatedTab from "./keywords/RelatedTab";
import SerpCompetitorsTab from "./keywords/SerpCompetitorsTab";
import SuggestionsTab from "./keywords/SuggestionsTab";
import TrendsTab from "./keywords/TrendsTab";
import VolumeTab from "./keywords/VolumeTab";

const TAB_IDS = [
  "overview",
  "volume",
  "bulk_volume",
  "suggestions",
  "related",
  "difficulty",
  "serp_competitors",
  "trends",
] as const;

type TabId = (typeof TAB_IDS)[number];

const TAB_LABEL_KEYS: Record<TabId, string> = {
  overview: "keywords.tabs.overview",
  volume: "keywords.tabs.volume",
  bulk_volume: "keywords.tabs.bulkVolume",
  suggestions: "keywords.tabs.suggestions",
  related: "keywords.tabs.related",
  difficulty: "keywords.tabs.difficulty",
  serp_competitors: "keywords.tabs.serpCompetitors",
  trends: "keywords.tabs.trends",
};

export default function KeywordsPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<TabId>("volume");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">{t("keywords.title")}</h2>
        <p className="text-sm text-slate-600">{t("keywords.description")}</p>
      </header>

      <nav className="flex gap-1 border-b">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors ${
              active === id
                ? "border-slate-800 font-medium text-slate-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t(TAB_LABEL_KEYS[id])}
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
      {active === "trends" && <TrendsTab />}
    </section>
  );
}
