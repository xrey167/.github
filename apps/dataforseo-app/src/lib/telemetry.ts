/// Frontend telemetry / crash-reporting init. Off by default — only
/// activates when both:
///  - VITE_SENTRY_DSN is set at build time
///  - the user has opted in via localStorage.crashReportsOptIn === "true"
///
/// This file deliberately avoids importing the Sentry SDK at the top
/// level so the dependency stays optional. When Sentry is added to
/// package.json (in a follow-up that wires the actual DSN), uncomment
/// the dynamic import below.

const OPT_IN_KEY = "crashReportsOptIn";

export function initTelemetry(): void {
  // import.meta.env is Vite's build-time-substituted env. tsconfig
  // doesn't pull in Vite's types here so we cast through unknown.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const dsn = env?.VITE_SENTRY_DSN;
  if (!dsn) return; // No DSN configured → no telemetry, full stop.

  const optedIn = localStorage.getItem(OPT_IN_KEY) === "true";
  if (!optedIn) return; // User hasn't enabled it.

  // The Sentry SDK isn't shipped yet to keep the install lean. When
  // `@sentry/react` is added to package.json, replace the log below
  // with the dynamic-import block. The scrubber is already defined
  // (see scrubCredentials) so the "credentials never leave the box"
  // promise holds the moment the SDK lights up.
  //
  //   import("@sentry/react").then((Sentry) => {
  //     Sentry.init({
  //       dsn,
  //       integrations: [Sentry.browserTracingIntegration()],
  //       tracesSampleRate: 0.1,
  //       beforeSend: scrubCredentials,
  //     });
  //   });
  //
  // For now log so it's clear the two gates fired correctly.
  // eslint-disable-next-line no-console
  console.info(`[telemetry] would initialize with DSN ${dsn.slice(0, 16)}...`);
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
