import { useEffect, useState } from "react";

import { useProject } from "../lib/project-store";
import CompetitorsDomainTab from "./domain/CompetitorsDomainTab";
import DomainIntersectionTab from "./domain/DomainIntersectionTab";
import KeywordGapTab from "./domain/KeywordGapTab";
import KeywordsForSiteTab from "./domain/KeywordsForSiteTab";
import RankOverviewTab from "./domain/RankOverviewTab";
import RankedKeywordsTab from "./domain/RankedKeywordsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "keywords", label: "Keywords" },
  { id: "ranked", label: "Ranked" },
  { id: "competitors", label: "Competitors" },
  { id: "gap", label: "Keyword Gap" },
  { id: "intersection", label: "Intersection" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DomainPage() {
  const { active: project } = useProject();
  const [target, setTarget] = useState(project?.target ?? "");
  const [active, setActive] = useState<TabId>("overview");

  // Sync the input when the user switches projects, but don't fight
  // them if they've manually typed a different target — we only update
  // when the input still equals the previous project (or is empty).
  useEffect(() => {
    if (project) {
      setTarget((cur) => (cur === "" ? project.target : cur));
    }
  }, [project]);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Domain</h2>
        <p className="text-sm text-slate-600">
          Keywords a domain ranks for and the SERP positions it currently holds.
        </p>
      </header>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Target domain or URL</span>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded border px-2 py-1 font-mono text-sm"
          placeholder="example.com"
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

      {active === "overview" && <RankOverviewTab target={target} />}
      {active === "keywords" && <KeywordsForSiteTab target={target} />}
      {active === "ranked" && <RankedKeywordsTab target={target} />}
      {active === "competitors" && <CompetitorsDomainTab target={target} />}
      {active === "gap" && <KeywordGapTab />}
      {active === "intersection" && <DomainIntersectionTab />}
    </section>
  );
}
