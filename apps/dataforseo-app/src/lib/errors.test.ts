import { describe, expect, it } from "vitest";

import { formatError } from "./errors";

describe("formatError", () => {
  it("returns a sentinel for null/undefined", () => {
    expect(formatError(null)).toBe("Unknown error");
    expect(formatError(undefined)).toBe("Unknown error");
  });

  it("passes a bare string through verbatim", () => {
    expect(formatError("disk full")).toBe("disk full");
  });

  it("formats Auth errors with a Settings hint", () => {
    expect(formatError({ Auth: "missing keychain entry" })).toContain(
      "missing keychain entry",
    );
    expect(formatError({ Auth: "x" })).toMatch(/Settings/);
  });

  it("includes both message and hint for known Api status codes", () => {
    const out = formatError({
      Api: { status_code: 40400, message: "no data" },
    });
    expect(out).toMatch(/no data/);
    expect(out).toMatch(/40400/);
    expect(out).toMatch(/no data for this query/i);
  });

  it("falls back to bare message for unknown Api status codes", () => {
    const out = formatError({
      Api: { status_code: 99999, message: "weird" },
    });
    expect(out).toMatch(/weird/);
    expect(out).toMatch(/99999/);
    // Unknown codes produce exactly one sentence (the bare message).
    // toBeLessThanOrEqual would still pass if a hint sneaked in;
    // toHaveLength(1) actually pins the contract.
    expect(out.split(".").filter(Boolean)).toHaveLength(1);
  });

  it("formats Validation errors verbatim", () => {
    expect(formatError({ Validation: "url is empty" })).toBe("url is empty");
  });

  it("prefixes Parse / Database / Internal with their kind", () => {
    expect(formatError({ Parse: "bad json" })).toMatch(/Parse error/i);
    expect(formatError({ Database: "locked" })).toMatch(/Database error/i);
    expect(formatError({ Internal: "panic" })).toMatch(/Internal error/i);
  });

  it("falls back to .message for plain JS Errors", () => {
    expect(formatError(new Error("boom"))).toBe("boom");
  });

  it("falls back to JSON.stringify for unrecognised shapes", () => {
    expect(formatError({ unknown: "shape" })).toContain("unknown");
  });

  it("recognises the auth-specific 40100 status code", () => {
    const out = formatError({
      Api: { status_code: 40100, message: "auth required" },
    });
    expect(out).toMatch(/credentials/i);
  });
});
