import { describe, expect, it } from "vitest";

import { scrubCredentials } from "./telemetry";

describe("scrubCredentials", () => {
  it("redacts credential-shaped keys at any nesting depth", () => {
    const event = {
      message: "Request failed",
      request: {
        url: "https://api.dataforseo.com/v3/labs/google/keyword_overview/live",
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
          "x-api-key": "abcd-1234",
          "Content-Type": "application/json",
        },
        body: { keyword: "seo tools", login: "me@example.com", password: "secret" },
      },
      breadcrumbs: [
        { category: "auth", message: "logging in", data: { token: "shhh" } },
      ],
    };
    const out = scrubCredentials(event) as typeof event;
    expect(out.request.headers.Authorization).toBe("[REDACTED]");
    expect(out.request.headers["x-api-key"]).toBe("[REDACTED]");
    expect(out.request.headers["Content-Type"]).toBe("application/json");
    expect(out.request.body.password).toBe("[REDACTED]");
    expect(out.request.body.login).toBe("[REDACTED]");
    expect(out.request.body.keyword).toBe("seo tools");
    expect(out.breadcrumbs[0].data.token).toBe("[REDACTED]");
    // Top-level message is preserved verbatim — it had no sensitive
    // shape.
    expect(out.message).toBe("Request failed");
  });

  it("redacts inline basic-auth tokens inside string values", () => {
    const event = { message: "Authorization: Basic dXNlcjpwYXNzd29yZA==" };
    const out = scrubCredentials(event) as typeof event;
    expect(out.message).toContain("[REDACTED]");
    expect(out.message).not.toContain("dXNlcjpwYXNzd29yZA==");
  });

  it("redacts password / token URL params while keeping the key visible", () => {
    const event = {
      url: "https://example.com/login?email=me@x.com&password=hunter2&next=/home",
    };
    const out = scrubCredentials(event) as typeof event;
    expect(out.url).toBe(
      "https://example.com/login?email=me@x.com&password=[REDACTED]&next=/home",
    );
  });

  it("leaves null and primitives intact", () => {
    expect(scrubCredentials(null)).toBeNull();
    expect(scrubCredentials(42)).toBe(42);
    expect(scrubCredentials(true)).toBe(true);
    expect(scrubCredentials("plain string")).toBe("plain string");
  });

  it("preserves Date / Error / RegExp instances instead of stripping to {}", () => {
    // Object.entries(new Date()) returns [], so the naive walker would
    // silently drop these. The scrubber must hand them back unchanged so
    // timestamps + stack traces survive into Sentry.
    const date = new Date("2026-05-03T12:00:00Z");
    const err = new Error("boom");
    const re = /pattern/i;
    expect(scrubCredentials(date)).toBe(date);
    expect(scrubCredentials(err)).toBe(err);
    expect(scrubCredentials(re)).toBe(re);
    // Preserved inside a containing object, too.
    const event = { message: "failed", error: err, ts: date };
    const out = scrubCredentials(event) as typeof event;
    expect(out.error).toBe(err);
    expect(out.ts).toBe(date);
  });
});
