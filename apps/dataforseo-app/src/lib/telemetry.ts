/// Frontend telemetry / crash-reporting. Off by default — only
/// activates when both:
///  - VITE_SENTRY_DSN is set at build time
///  - the user has opted in via localStorage.crashReportsOptIn === "true"
///
/// Sentry is loaded via dynamic import so the SDK only ships in the
/// runtime bundle when the DSN is actually configured.

const OPT_IN_KEY = "crashReportsOptIn";

export function initTelemetry(): void {
  // import.meta.env is Vite's build-time-substituted env. tsconfig
  // doesn't pull in Vite's types here so we cast through unknown.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const dsn = env?.VITE_SENTRY_DSN;
  if (!dsn) return; // No DSN configured → no telemetry, full stop.

  const optedIn = localStorage.getItem(OPT_IN_KEY) === "true";
  if (!optedIn) return; // User hasn't enabled it.

  // Dynamic import keeps the SDK out of the bundle when not configured.
  // The scrubber is wired through `beforeSend` so credentials never
  // leave the box even when reporting is on. browserTracingIntegration
  // is required for `tracesSampleRate` to actually activate.
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        integrations: [Sentry.browserTracingIntegration()],
        // 10% transaction sampling keeps the budget reasonable while
        // still catching slow-call regressions.
        tracesSampleRate: 0.1,
        beforeSend: scrubCredentials,
        beforeBreadcrumb: scrubCredentials,
      });
    })
    .catch((e) => {
      // Loading Sentry must never crash the app — it's purely opt-in
      // observability. Log and move on.
      // eslint-disable-next-line no-console
      console.warn("[telemetry] Sentry init failed:", e);
    });
}

/// Sentry `beforeSend` hook. Walks the event tree recursively and
/// redacts any field whose key looks credential-shaped, plus any
/// string value matching a basic-auth header or login/password
/// URL-parameter pattern. Exported so unit tests can pin the
/// behavior independently of the SDK actually being loaded.
export function scrubCredentials<T>(event: T): T {
  return walk(event) as T;
}

const SENSITIVE_KEY =
  /^(authorization|password|api[_-]?key|secret|token|cookie|set-cookie|x-api-key|login|email)$/i;
const BASIC_AUTH_PATTERN = /Basic\s+[A-Za-z0-9+/=]{8,}/gi;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._\-+/=]{8,}/gi;
// login=…&password=… in URL/form payloads — keep the &/? + key= shape
// so the redacted log is still recognisable as the same parameter.
const QUERY_CRED_PATTERN = /([?&])(password|token|api[_-]?key)=[^&\s]+/gi;

function walk(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map(walk);
  // Preserve non-plain objects whose own-enumerable keys are empty —
  // Object.entries(new Date()) and Object.entries(new Error()) both
  // return [], so naive walking would silently drop them. We hand the
  // SDK back the original instance so timestamps / stack traces survive.
  if (value instanceof Date || value instanceof Error || value instanceof RegExp) {
    return value;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = walk(v);
      }
    }
    return out;
  }
  return value;
}

function scrubString(s: string): string {
  return s
    // First two patterns have no capture groups — replace the whole match.
    .replace(BASIC_AUTH_PATTERN, "[REDACTED]")
    .replace(BEARER_PATTERN, "[REDACTED]")
    // Query-cred has two groups (separator + key name); keep them visible.
    .replace(
      QUERY_CRED_PATTERN,
      (_match, separator: string, keyName: string) =>
        `${separator}${keyName}=[REDACTED]`,
    );
}

/// Toggle persisted user preference. Call from a Settings checkbox.
export function setCrashReportsOptIn(value: boolean): void {
  if (value) localStorage.setItem(OPT_IN_KEY, "true");
  else localStorage.removeItem(OPT_IN_KEY);
}

export function getCrashReportsOptIn(): boolean {
  return localStorage.getItem(OPT_IN_KEY) === "true";
}
