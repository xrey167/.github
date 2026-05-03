import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CacheBadge from "./CacheBadge";

describe("CacheBadge", () => {
  beforeEach(() => {
    // Pin "now" so relative formatting is deterministic. UTC throughout
    // so the 30-min / 35-min deltas don't drift if the test runner's
    // local timezone changes (CI containers vary).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when fromCache is false", () => {
    const { container } = render(
      <CacheBadge fromCache={false} fetchedAt="2026-05-03T11:30:00Z" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'cached · just now' for sub-minute deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03T11:59:30Z" />,
    );
    expect(container.textContent).toMatch(/cached/);
    expect(container.textContent).toMatch(/just now/);
  });

  it("renders minutes for sub-hour deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03T11:25:00Z" />,
    );
    expect(container.textContent).toMatch(/35m ago/);
  });

  it("renders hours for sub-day deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03T09:00:00Z" />,
    );
    expect(container.textContent).toMatch(/3h ago/);
  });

  it("renders days for sub-month deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-04-29T12:00:00Z" />,
    );
    expect(container.textContent).toMatch(/4d ago/);
  });

  it("falls back to YYYY-MM-DD for older timestamps", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-01-01T00:00:00Z" />,
    );
    expect(container.textContent).toMatch(/2026-01-01/);
  });

  it("handles the DuckDB space-separated format (auto-appends Z)", () => {
    // Production path: DuckDB writes "YYYY-MM-DD HH:MM:SS" with no
    // separator and no zone. CacheBadge normalises by inserting "T"
    // and appending "Z". This case pins that branch independently of
    // the ISO-formatted cases above.
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03 11:25:00" />,
    );
    expect(container.textContent).toMatch(/35m ago/);
  });

  it("handles a null fetchedAt by rendering 'cached' alone", () => {
    const { container } = render(<CacheBadge fromCache fetchedAt={null} />);
    expect(container.textContent).toBe("cached");
  });
});
