import type { ColumnDef } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as exportLib from "../lib/export";
import ExportMenu from "./ExportMenu";

interface Row {
  name: string;
  count: number;
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "count", header: "Count" },
];

describe("ExportMenu", () => {
  beforeEach(() => {
    // Stub both download helpers so the click flow doesn't touch jsdom's
    // anchor.click()/Blob URL plumbing.
    vi.spyOn(exportLib, "downloadCsv").mockImplementation(() => {});
    vi.spyOn(exportLib, "downloadJson").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables the trigger when rows is empty", () => {
    render(
      <ExportMenu filenameStem="test" rows={[]} columns={columns} />,
    );
    const button = screen.getByRole("button", { name: /export/i });
    expect(button).toBeDisabled();
  });

  it("opens the menu when clicked", () => {
    render(
      <ExportMenu
        filenameStem="test"
        rows={[{ name: "a", count: 1 }]}
        columns={columns}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("triggers downloadCsv with a timestamped filename", () => {
    render(
      <ExportMenu
        filenameStem="my-rows"
        rows={[{ name: "a", count: 1 }]}
        columns={columns}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByText(/download csv/i));
    expect(exportLib.downloadCsv).toHaveBeenCalledTimes(1);
    const [, , filename] = (exportLib.downloadCsv as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(filename).toMatch(/^my-rows-\d{8}-\d{6}\.csv$/);
  });

  it("triggers downloadJson and closes the menu after the click", () => {
    render(
      <ExportMenu
        filenameStem="data"
        rows={[{ name: "a", count: 1 }]}
        columns={columns}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByText(/download json/i));
    expect(exportLib.downloadJson).toHaveBeenCalledTimes(1);
    // Menu should auto-close after the action.
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when the user clicks outside (backdrop)", () => {
    const { container } = render(
      <ExportMenu
        filenameStem="test"
        rows={[{ name: "a", count: 1 }]}
        columns={columns}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    const backdrop = container.querySelector("[aria-hidden]");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
