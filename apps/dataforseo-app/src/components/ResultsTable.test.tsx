import type { ColumnDef } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ResultsTable from "./ResultsTable";

interface Row {
  name: string;
  score: number;
}

const COLS: ColumnDef<Row, unknown>[] = [
  { id: "name", header: "Name", accessorKey: "name" },
  { id: "score", header: "Score", accessorKey: "score" },
];

const ROWS: Row[] = [
  { name: "alpha", score: 30 },
  { name: "beta", score: 10 },
  { name: "gamma", score: 20 },
];

describe("ResultsTable", () => {
  it("renders the empty-state message when data is empty", () => {
    render(<ResultsTable data={[]} columns={COLS} emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeTruthy();
  });

  it("falls back to the default empty message", () => {
    render(<ResultsTable data={[]} columns={COLS} />);
    expect(screen.getByText(/no results yet/i)).toBeTruthy();
  });

  it("renders one row per data item", () => {
    render(<ResultsTable data={ROWS} columns={COLS} />);
    // 1 header row + 3 data rows = 4 total
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("alpha")).toBeTruthy();
    expect(screen.getByText("beta")).toBeTruthy();
    expect(screen.getByText("gamma")).toBeTruthy();
  });

  it("toggles sort order on repeated header clicks", () => {
    render(<ResultsTable data={ROWS} columns={COLS} />);
    const scoreHeader = screen.getByText("Score");

    function getNamesInOrder(): string[] {
      // First row is the header — slice(1) skips it.
      return screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => r.querySelector("td")!.textContent ?? "");
    }
    // Initial unsorted order matches the input data.
    expect(getNamesInOrder()).toEqual(["alpha", "beta", "gamma"]);

    // TanStack Table's first click on a numeric column sorts descending.
    fireEvent.click(scoreHeader);
    expect(getNamesInOrder()).toEqual(["alpha", "gamma", "beta"]); // 30, 20, 10

    // Second click flips to ascending.
    fireEvent.click(scoreHeader);
    expect(getNamesInOrder()).toEqual(["beta", "gamma", "alpha"]); // 10, 20, 30
  });

  it("indicates the active sort direction with an arrow glyph", () => {
    render(<ResultsTable data={ROWS} columns={COLS} />);
    const scoreHeader = screen.getByText("Score");
    fireEvent.click(scoreHeader);
    // First click on numeric column → descending → ▼.
    // Asserting on the <th> directly (not the row) so a glyph that
    // accidentally rendered in a sibling column wouldn't pass.
    expect(scoreHeader.textContent).toMatch(/▼/);
    fireEvent.click(scoreHeader);
    expect(scoreHeader.textContent).toMatch(/▲/);
  });
});
