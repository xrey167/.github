/// Centralized error formatter that turns Rust AppError shapes into
/// user-friendly toast/banner strings. Pairs with the AppError enum in
/// src-tauri/src/errors.rs which serializes as { Auth | Api | Validation
/// | Parse | Database | Internal } depending on variant.

interface RawError {
  message?: string;
  Auth?: string;
  Validation?: string;
  Parse?: string;
  Database?: string;
  Internal?: string;
  Api?: { status_code?: number; message?: string };
}

const API_HINTS: Record<number, string> = {
  10000: "Bad request — check the parameters and try again.",
  20100: "Auth failed — verify your DataForSEO credentials in Settings.",
  40000: "Bad request — check the parameters and try again.",
  40100: "Auth failed — verify your DataForSEO credentials in Settings.",
  40200: "Account inactive or out of credit. Top up at dataforseo.com.",
  40300: "Forbidden — your account doesn't have access to this endpoint.",
  40400: "DataForSEO has no data for this query.",
  40500: "DataForSEO endpoint disallows the requested method.",
  40600: "Request timed out — try again in a moment.",
  40900: "Conflict on DataForSEO's side — try again in a moment.",
  42900: "Rate-limited by DataForSEO — try again shortly.",
  50000: "DataForSEO internal error — try again in a moment.",
  50300: "DataForSEO is temporarily unavailable.",
};

/// Format an unknown caught error into a user-facing string.
///
/// Pass `context` to prepend a short label that tells the user *which*
/// operation failed (e.g. "Sessions" → "Sessions: ..."). The label is
/// rendered verbatim, so callers that want a localised label should
/// pass a translated string (e.g. `t("common.failed")`).
export function formatError(e: unknown, context?: string): string {
  const base = formatBase(e);
  return context ? `${context}: ${base}` : base;
}

function formatBase(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  const raw = e as RawError;

  if (raw.Auth) {
    return `Auth: ${raw.Auth}. Set your DataForSEO credentials in Settings.`;
  }
  if (raw.Api) {
    const sc = raw.Api.status_code ?? 0;
    const hint = API_HINTS[sc];
    const msg = raw.Api.message ?? "DataForSEO error";
    return hint ? `${msg} (${sc}). ${hint}` : `${msg} (${sc}).`;
  }
  if (raw.Validation) return raw.Validation;
  if (raw.Parse) return `Parse error: ${raw.Parse}`;
  if (raw.Database) return `Database error: ${raw.Database}`;
  if (raw.Internal) return `Internal error: ${raw.Internal}`;

  // Fall back to .message from a JS Error or anything else.
  if (typeof raw.message === "string") return raw.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
