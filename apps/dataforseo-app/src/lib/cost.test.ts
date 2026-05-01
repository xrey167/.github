import { describe, expect, it } from "vitest";

import { estimate } from "./cost";

describe("cost.estimate", () => {
  it("matches Rust: search_volume live 1000 keywords = 0.075", () => {
    expect(
      estimate({ kind: "KeywordsSearchVolume", count: 1000, mode: "live" }),
    ).toBeCloseTo(0.075, 9);
  });

  it("matches Rust: search_volume standard 2500 keywords = 0.15", () => {
    expect(
      estimate({
        kind: "KeywordsSearchVolume",
        count: 2500,
        mode: "standard",
      }),
    ).toBeCloseTo(0.15, 9);
  });

  it("matches Rust: SERP depth 100 is 10x baseline", () => {
    const baseline = estimate({
      kind: "Serp",
      count: 1,
      mode: "live",
      depth: 10,
      extra_params: 0,
    });
    const deep = estimate({
      kind: "Serp",
      count: 1,
      mode: "live",
      depth: 100,
      extra_params: 0,
    });
    expect(deep).toBeCloseTo(baseline * 10, 9);
  });

  it("matches Rust: each extra_param multiplies cost by 5", () => {
    const zero = estimate({
      kind: "Serp",
      count: 1,
      mode: "live",
      depth: 10,
      extra_params: 0,
    });
    const two = estimate({
      kind: "Serp",
      count: 1,
      mode: "live",
      depth: 10,
      extra_params: 2,
    });
    expect(two).toBeCloseTo(zero * 25, 9);
  });
});
