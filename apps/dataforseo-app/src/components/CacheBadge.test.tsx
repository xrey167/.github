import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CacheBadge from "./CacheBadge";

describe("CacheBadge", () => {
  beforeEach(() => {
    // Pin "now" so relative formatting is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when fromCache is false", () => {
    const { container } = render(
      <CacheBadge fromCache={false} fetchedAt="2026-05-03 11:30:00" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'cached · just now' for sub-minute deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03 11:59:30" />,
    );
    expect(container.textContent).toMatch(/cached/);
    expect(container.textContent).toMatch(/just now/);
  });

  it("renders minutes for sub-hour deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03 11:25:00" />,
    );
    expect(container.textContent).toMatch(/35m ago/);
  });

  it("renders hours for sub-day deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-05-03 09:00:00" />,
    );
    expect(container.textContent).toMatch(/3h ago/);
  });

  it("renders days for sub-month deltas", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-04-29 12:00:00" />,
    );
    expect(container.textContent).toMatch(/4d ago/);
  });

  it("falls back to YYYY-MM-DD for older timestamps", () => {
    const { container } = render(
      <CacheBadge fromCache fetchedAt="2026-01-01 00:00:00" />,
    );
    expect(container.textContent).toMatch(/2026-01-01/);
  });

  it("handles a null fetchedAt by rendering 'cached' alone", () => {
    const { container } = render(<CacheBadge fromCache fetchedAt={null} />);
    expect(container.textContent).toBe("cached");
  });
});
