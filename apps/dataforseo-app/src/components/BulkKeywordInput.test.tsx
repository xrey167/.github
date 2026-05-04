import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import BulkKeywordInput, { parseKeywords } from "./BulkKeywordInput";

function Harness({ initial = "", maxKeywords }: { initial?: string; maxKeywords?: number }) {
  const [value, setValue] = useState(initial);
  return <BulkKeywordInput value={value} onChange={setValue} maxKeywords={maxKeywords} />;
}

describe("parseKeywords", () => {
  it("splits on newlines and trims whitespace", () => {
    expect(parseKeywords("seo\n  agentur \nkeyword research")).toEqual([
      "seo",
      "agentur",
      "keyword research",
    ]);
  });

  it("drops blank lines", () => {
    expect(parseKeywords("a\n\n\nb\n   \nc")).toEqual(["a", "b", "c"]);
  });

  it("deduplicates while preserving first-seen order", () => {
    expect(parseKeywords("foo\nbar\nfoo\nbaz\nbar")).toEqual(["foo", "bar", "baz"]);
  });

  it("handles \\r\\n line endings", () => {
    expect(parseKeywords("alpha\r\nbeta\r\n")).toEqual(["alpha", "beta"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseKeywords("")).toEqual([]);
  });
});

describe("BulkKeywordInput", () => {
  it("renders the textarea and a singular zero-keyword counter", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/keywords/i)).toBeInTheDocument();
    expect(screen.getByText("0 unique keywords")).toBeInTheDocument();
  });

  it("updates the unique-keyword count as the user types", () => {
    render(<Harness />);
    const textarea = screen.getByLabelText(/keywords/i);
    fireEvent.change(textarea, { target: { value: "foo\nbar\nfoo" } });
    // foo + bar = 2 unique, despite three input lines.
    expect(screen.getByText("2 unique keywords")).toBeInTheDocument();
  });

  it("uses singular noun for exactly one keyword", () => {
    render(<Harness initial="only-one" />);
    expect(screen.getByText("1 unique keyword")).toBeInTheDocument();
  });

  it("flags an over-limit count in red and shows the cap", () => {
    render(<Harness initial={"a\nb\nc\nd"} maxKeywords={3} />);
    expect(screen.getByText("4 unique keywords")).toBeInTheDocument();
    expect(screen.getByText(/maximum 3 keywords/i)).toBeInTheDocument();
  });
});
