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
    };

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
  }
}
