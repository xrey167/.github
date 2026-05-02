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
  | { kind: "OnPageAudit"; max_pages: number };

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
  }
}
