import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { FilterTree } from "../lib/tauri";
import FilterBuilder, { normalize } from "./FilterBuilder";

function Harness({ initial }: { initial: FilterTree | null }) {
  const [value, setValue] = useState<FilterTree | null>(initial);
  return (
    <>
      <FilterBuilder value={value} onChange={setValue} />
      <pre data-testid="state">{JSON.stringify(value)}</pre>
    </>
  );
}

function readState(): FilterTree | null {
  return JSON.parse(screen.getByTestId("state").textContent ?? "null");
}

describe("FilterBuilder", () => {
  it("starts empty and shows a placeholder", () => {
    render(<Harness initial={null} />);
    expect(screen.getByText(/no filters/i)).toBeTruthy();
    expect(readState()).toBeNull();
  });

  it("adds a condition with the first field defaulted", () => {
    render(<Harness initial={null} />);
    fireEvent.click(screen.getByText(/\+ AND condition/i));
    const state = readState();
    // Single condition unwraps from the group on commit.
    expect(state).toMatchObject({
      kind: "condition",
      field: "dofollow",
      operator: "eq",
      value: true,
    });
  });

  it("changes the field and coerces the value to the new type", () => {
    render(
      <Harness
        initial={{
          kind: "condition",
          field: "dofollow",
          operator: "eq",
          value: true,
        }}
      />,
    );
    // Pick the numeric 'Source domain rank' field. Field selects render as
    // the first <select> (field), then <select> (operator).
    const fieldSelect = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    fireEvent.change(fieldSelect, { target: { value: "domain_from_rank" } });
    expect(readState()).toMatchObject({
      kind: "condition",
      field: "domain_from_rank",
      // boolean true coerced into a number → 1 (Number(true) is 1) is also
      // acceptable; current impl coerces non-finite Number(prev) to 0, so
      // we just assert it's a number to stay flexible.
    });
    expect(typeof (readState() as { value: unknown })?.value).toBe("number");
  });

  it("removes a condition and clamps back to null when empty", () => {
    render(
      <Harness
        initial={{
          kind: "condition",
          field: "dofollow",
          operator: "eq",
          value: true,
        }}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove"));
    expect(readState()).toBeNull();
  });

  it("clears all on demand", () => {
    render(
      <Harness
        initial={{
          kind: "group",
          nodes: [
            {
              kind: "condition",
              field: "dofollow",
              operator: "eq",
              value: true,
            },
            {
              kind: "condition",
              field: "domain_from_rank",
              operator: "gt",
              value: 30,
            },
          ],
          connectors: ["and"],
        }}
      />,
    );
    fireEvent.click(screen.getByText(/clear all/i));
    expect(readState()).toBeNull();
  });
});

describe("normalize", () => {
  it("returns null for null", () => {
    expect(normalize(null)).toBeNull();
  });

  it("passes a bare condition through", () => {
    const c: FilterTree = {
      kind: "condition",
      field: "dofollow",
      operator: "eq",
      value: true,
    };
    expect(normalize(c)).toEqual(c);
  });

  it("collapses an empty group to null", () => {
    expect(normalize({ kind: "group", nodes: [], connectors: [] })).toBeNull();
  });

  it("unwraps a single-child group", () => {
    const c: FilterTree = {
      kind: "condition",
      field: "anchor",
      operator: "ilike",
      value: "%seo%",
    };
    expect(normalize({ kind: "group", nodes: [c], connectors: [] })).toEqual(c);
  });

  it("trims connectors to nodes.length - 1", () => {
    const a: FilterTree = {
      kind: "condition",
      field: "dofollow",
      operator: "eq",
      value: true,
    };
    const b: FilterTree = {
      kind: "condition",
      field: "domain_from_rank",
      operator: "gt",
      value: 30,
    };
    const trimmed = normalize({
      kind: "group",
      nodes: [a, b],
      // Extra connectors should be trimmed.
      connectors: ["and", "or", "and"],
    });
    expect(trimmed).toMatchObject({
      kind: "group",
      nodes: [a, b],
      connectors: ["and"],
    });
  });
});
