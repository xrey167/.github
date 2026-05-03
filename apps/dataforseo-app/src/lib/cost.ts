// Mirror of src-tauri/src/domain/cost.rs.
// Source-of-truth for ledger comparisons is the Rust side; this exists
// only for debounced live-preview without a Tauri round-trip.

export type Mode = "live" | "priority" | "standard";

export type CostAction =
  | { kind: "KeywordsSearchVolume"; count: number; mode: Mode }
  | { kind: "KeywordsSuggestions"; mode: Mode }
  | { kind: "KeywordsRelated"; depth: number; mode: Mode }
  | { kind: "KeywordsForDomain"; mode: Mode }
  | {
      kind: "Serp";
      count: number;
      mode: Mode;
      depth: number;
      extra_params: number;
    }
  | { kind: "Backlinks"; target_count: number; rows_per_target: number }
  | { kind: "DomainAnalyticsWhois"; rows: number }
  | { kind: "DomainAnalyticsTechnologies" }
  | { kind: "LabsDomainRankOverview" }
  | { kind: "LabsBulkKeywordDifficulty"; count: number }
  | { kind: "LabsSerpCompetitors" }
  | { kind: "LabsCompetitorsDomain" }
  | { kind: "LabsDomainIntersection" }
  | { kind: "OnPageInstantPages" }
  | { kind: "OnPageLighthouse" }
  | { kind: "LabsBulkSearchVolume"; count: number }
  | { kind: "OnPageAudit"; max_pages: number }
  | { kind: "LabsKeywordOverview" }
  | { kind: "LabsSearchIntent" }
  | { kind: "TopicResearch" }
  | { kind: "SerpAutocomplete" }
  | { kind: "SerpAiOverview" }
  | { kind: "KeywordsTrends" }
  | { kind: "LabsCategoriesForDomain" }
  | { kind: "GoogleAdsKeywordsExpansion" }
  | { kind: "ContentAnalysisSearch"; rows: number }
  | { kind: "ContentAnalysisSummary" }
  | { kind: "ContentAnalysisSentiment"; rows: number }
  | { kind: "BacklinksBulk"; target_count: number }
  | { kind: "BacklinksDomainPagesSummary" }
  | { kind: "BacklinksAvailableFilters" }
  | { kind: "OnPageSubItems"; rows: number }
  | { kind: "OnPageLighthouseAudits" }
  | { kind: "OnPageContentParsing" }
  | { kind: "LabsFlat" }
  | { kind: "LabsCategoriesForKeywords" }
  | { kind: "ContentAnalysisRatingDistribution" }
  | { kind: "ContentAnalysisPhraseTrends"; rows: number }
  | { kind: "ContentAnalysisCategoryTrends"; rows: number }
  | { kind: "DomainAnalyticsDomainsByTechnology" }
  | { kind: "DomainAnalyticsAggregationTechnologies" }
  | { kind: "AppendixFree" }
  | { kind: "AppData" };

export function estimate(action: CostAction): number {
  switch (action.kind) {
    case "KeywordsSearchVolume": {
      const base = action.mode === "live" ? 0.075 : 0.05;
      const requests = Math.max(1, Math.ceil(action.count / 1000));
      return requests * base;
    }
    case "KeywordsSuggestions":
      return action.mode === "live" ? 0.0125 : 0.0075;
    case "KeywordsRelated": {
      const base = action.mode === "live" ? 0.0125 : 0.0075;
      return base * Math.max(1, action.depth);
    }
    case "KeywordsForDomain":
      return action.mode === "live" ? 0.0125 : 0.0075;
    case "Serp": {
      const base =
        action.mode === "live"
          ? 0.002
          : action.mode === "priority"
            ? 0.0012
            : 0.0006;
      const depthMult =
        action.depth <= 10 ? 1 : Math.ceil(action.depth / 10);
      const paramMult = Math.pow(5, action.extra_params);
      return action.count * base * depthMult * paramMult;
    }
    case "Backlinks": {
      const requestsPerTarget = Math.max(
        1,
        Math.ceil(action.rows_per_target / 1000),
      );
      const totalRequests = action.target_count * requestsPerTarget;
      return (
        totalRequests * 0.02 +
        action.target_count * action.rows_per_target * 0.00003
      );
    }
    case "DomainAnalyticsWhois":
      return Math.max(1, action.rows) * 0.0001;
    case "DomainAnalyticsTechnologies":
      return 0.001;
    case "LabsDomainRankOverview":
      return 0.0125;
    case "LabsBulkKeywordDifficulty":
      return Math.max(1, action.count) * 0.0001;
    case "LabsSerpCompetitors":
    case "LabsCompetitorsDomain":
    case "LabsDomainIntersection":
      return 0.0125;
    case "OnPageInstantPages":
    case "OnPageLighthouse":
      return 0.0025;
    case "LabsBulkSearchVolume":
      return Math.max(1, action.count) * 0.0001;
    case "OnPageAudit":
      return Math.max(1, action.max_pages) * 0.000125;
    case "LabsKeywordOverview":
    case "LabsSearchIntent":
      return 0.0125;
    case "TopicResearch":
      return 0.0125 + 0.002 + 3 * 0.0025;
    case "SerpAutocomplete":
      return 0.002;
    case "SerpAiOverview":
      return 0.0001;
    case "KeywordsTrends":
      return 0.05;
    case "LabsCategoriesForDomain":
      return 0.0001;
    case "GoogleAdsKeywordsExpansion":
      return 0.075;
    case "ContentAnalysisSearch":
      return Math.max(1, action.rows) * 0.001;
    case "ContentAnalysisSummary":
      return 0.001;
    case "ContentAnalysisSentiment":
      return Math.max(1, action.rows) * 0.0005;
    case "BacklinksBulk":
      return Math.max(1, action.target_count) * 0.02;
    case "BacklinksDomainPagesSummary":
      return 0.02;
    case "BacklinksAvailableFilters":
    case "OnPageLighthouseAudits":
    case "AppendixFree":
      return 0.0;
    case "OnPageSubItems":
      return Math.max(1, action.rows) * 0.0001;
    case "OnPageContentParsing":
      return 0.0025;
    case "LabsFlat":
      return 0.0125;
    case "LabsCategoriesForKeywords":
      return 0.0001;
    case "ContentAnalysisRatingDistribution":
      return 0.0005;
    case "ContentAnalysisPhraseTrends":
      return Math.max(1, action.rows) * 0.0005;
    case "ContentAnalysisCategoryTrends":
      return Math.max(1, action.rows) * 0.0005;
    case "DomainAnalyticsDomainsByTechnology":
    case "DomainAnalyticsAggregationTechnologies":
      return 0.001;
    case "AppData":
      return 0.002;
  }
}
