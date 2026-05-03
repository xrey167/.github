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
  // we add `@sentry/react`, replace the warn below with:
  //
  //   import("@sentry/react").then((Sentry) => {
  //     Sentry.init({
  //       dsn,
  //       integrations: [Sentry.browserTracingIntegration()],
  //       tracesSampleRate: 0.1,
  //       beforeSend(event) {
  //         return scrubCredentials(event);
  //       },
  //     });
  //   });
  //
  // For now we just log so it's clear the gate works.
  // eslint-disable-next-line no-console
  console.info(`[telemetry] would initialize with DSN ${dsn.slice(0, 16)}...`);
}

/// Toggle persisted user preference. Call from a Settings checkbox.
export function setCrashReportsOptIn(value: boolean): void {
  if (value) localStorage.setItem(OPT_IN_KEY, "true");
  else localStorage.removeItem(OPT_IN_KEY);
}

export function getCrashReportsOptIn(): boolean {
  return localStorage.getItem(OPT_IN_KEY) === "true";
}
