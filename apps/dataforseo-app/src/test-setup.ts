import "@testing-library/jest-dom/vitest";

// jsdom's Blob lacks .text() in the bundled version vitest pulls in.
// jsdom holds the Blob bytes in a private `_buffer` field; we read it
// directly so the returned Promise resolves in the same microtask. The
// FileReader fallback works but is async enough that 10 ms-scoped
// setTimeout assertions in tests can race past it.
if (typeof Blob !== "undefined" && typeof Blob.prototype.text !== "function") {
  Blob.prototype.text = function (this: Blob): Promise<string> {
    const buf = (this as unknown as { _buffer?: { toString(enc: string): string } })
      ._buffer;
    if (buf && typeof buf.toString === "function") {
      return Promise.resolve(buf.toString("utf-8"));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

// Anchor download flow in lib/export.ts does
// document.body.appendChild(a); a.click(); document.body.removeChild(a);
// jsdom throws "Not implemented: navigation (except hash changes)" on
// the synthetic click. Stub HTMLAnchorElement.click to a no-op so
// download tests can verify the captured Blob without the click flow
// blowing up.
if (typeof HTMLAnchorElement !== "undefined") {
  HTMLAnchorElement.prototype.click = function () {
    /* no-op for jsdom downloads */
  };
}
