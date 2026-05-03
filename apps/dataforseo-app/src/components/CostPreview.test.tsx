import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CostPreview from "./CostPreview";

describe("CostPreview", () => {
  it("renders the estimated cost from the action", () => {
    render(
      <CostPreview action={{ kind: "Backlinks", target_count: 1, rows_per_target: 100 }} />,
    );
    // We don't assert exact $ since cost.ts owns the math; just that
    // a $-prefixed currency string actually rendered.
    expect(screen.getByText(/estimated cost/i)).toBeTruthy();
    expect(screen.getByText(/\$/)).toBeTruthy();
  });

  it("renders detail bullets when provided", () => {
    render(
      <CostPreview
        action={{ kind: "Backlinks", target_count: 1, rows_per_target: 100 }}
        details={["Up to 100 rows", "Status: live"]}
      />,
    );
    expect(screen.getByText("Up to 100 rows")).toBeTruthy();
    expect(screen.getByText("Status: live")).toBeTruthy();
  });

  it("dims the preview when disabled", () => {
    const { container } = render(
      <CostPreview
        action={{ kind: "Backlinks", target_count: 1, rows_per_target: 100 }}
        disabled
      />,
    );
    expect(container.firstChild).toHaveClass("opacity-60");
  });

  it("omits the bullet list when details is empty", () => {
    const { container } = render(
      <CostPreview
        action={{ kind: "Backlinks", target_count: 1, rows_per_target: 100 }}
        details={[]}
      />,
    );
    expect(container.querySelector("ul")).toBeNull();
  });
});
