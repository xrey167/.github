import { describe, expect, it } from "vitest";

import { formatCount, formatUsd } from "./format";

describe("formatUsd", () => {
  it("renders four fraction digits even for round dollar amounts", () => {
    expect(formatUsd(1)).toBe("$1.0000");
    expect(formatUsd(0)).toBe("$0.0000");
  });

  it("preserves four-digit precision for sub-cent amounts", () => {
    // SERP organic depth=10 is $0.0006; we'd lose the rationale to a
    // user if format collapsed it to $0.00.
    expect(formatUsd(0.0006)).toBe("$0.0006");
    expect(formatUsd(0.000125)).toBe("$0.0001"); // rounds at 4 dp
  });

  it("formats negative values with a leading minus", () => {
    expect(formatUsd(-3.5)).toMatch(/^-\$3\.5000$/);
  });

  it("groups thousands with commas", () => {
    expect(formatUsd(1234.5678)).toBe("$1,234.5678");
  });
});

describe("formatCount", () => {
  it("returns the bare integer for sub-thousand counts", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("compacts thousands with K (rounded to integer for K-range)", () => {
    // Default Intl compact notation rounds the thousands range to whole
    // K — that's deliberate so the badge stays at 2-3 chars.
    expect(formatCount(1_000)).toBe("1K");
    expect(formatCount(12_500)).toBe("13K");
  });

  it("compacts millions with M (one fraction digit)", () => {
    expect(formatCount(1_000_000)).toBe("1M");
    expect(formatCount(2_400_000)).toBe("2.4M");
  });
});
