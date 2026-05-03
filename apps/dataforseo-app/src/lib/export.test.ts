import { describe, expect, it } from "vitest";

import { downloadCsv } from "./export";

describe("downloadCsv", () => {
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    let captured = "";
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    const origAppend = document.body.appendChild.bind(document.body);
    URL.createObjectURL = (blob: Blob) => {
      blob.text().then((t) => {
        captured = t;
      });
      return "blob:test";
    };
    URL.revokeObjectURL = () => undefined;
    // appendChild is `<T extends Node>(node: T) => T` — the mock has to
    // be generic too so it doesn't widen the return type to Node.
    document.body.appendChild = <T extends Node>(node: T): T => {
      if (node instanceof HTMLAnchorElement) {
        // skip the actual click — text is captured via createObjectURL
      }
      return origAppend(node) as T;
    };

    const rows = [
      { kw: "hello, world", vol: 100 },
      { kw: 'with "quotes"', vol: 200 },
      { kw: "line\nbreak", vol: 300 },
    ];
    downloadCsv(
      rows,
      [
        { header: "Keyword", accessorKey: "kw" },
        { header: "Volume", accessorKey: "vol" },
      ],
      "test.csv",
    );

    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(captured).toContain('"hello, world"');
        expect(captured).toContain('"with ""quotes"""');
        expect(captured).toContain('"line\nbreak"');
        resolve();
      }, 10);
    });
  });

  it("falls back to column id when header is not a string", () => {
    let captured = "";
    URL.createObjectURL = (blob: Blob) => {
      blob.text().then((t) => {
        captured = t;
      });
      return "blob:test";
    };
    URL.revokeObjectURL = () => undefined;

    downloadCsv(
      [{ a: 1 }],
      [{ id: "computed", header: () => null, accessorKey: "a" }],
      "test.csv",
    );

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // CSV uses CRLF per RFC 4180, so split on \r?\n to drop the
        // trailing \r that would otherwise leak into [0].
        expect(captured.split(/\r?\n/)[0]).toBe("computed");
        resolve();
      }, 10);
    });
  });
});
