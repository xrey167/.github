# Architecture

## Stack
- **Backend (Rust)** — Tauri 2 + DuckDB + reqwest + tokio + tracing-subscriber
- **Frontend (TS/React)** — Vite + React 18 + react-router + react-hot-toast + recharts + tanstack/react-table + Tailwind
- **Cross-boundary types** — `ts-rs` macro generates `.ts` files from `#[derive(TS)]` Rust structs into `src/lib/types/`. The frontend imports those types via `src/lib/tauri.ts`.

## Process model

```
┌────────────── Tauri webview ──────────────┐
│  React app                                 │
│  - tauriApi.* shims (1:1 with commands)    │
│  - useProject() context                    │
│  - ErrorBoundary + formatError()           │
└────────────────────│───────────────────────┘
                     │ invoke(name, args)
┌────────────────────▼───────────────────────┐
│  Rust process                              │
│  - commands/* (Tauri command handlers)     │
│  - api/* (typed DataForSEO client)         │
│  - store/* (DuckDB CRUD)                   │
│  - tasks/* (background pollers)            │
│  - ratelimit/* (token-bucket)              │
└────────────────────────────────────────────┘
```

## Adding a new endpoint

1. **API method** — `src-tauri/src/api/{family}.rs`: a typed response struct + `impl ApiClient` async method that POSTs/GETs and parses.
2. **Cost variant** — `src-tauri/src/domain/cost.rs`: enum variant + match arm in `estimate()`.
3. **Endpoint constant** — `src-tauri/src/domain/endpoints.rs`: stable string for the ledger.
4. **Command** — `src-tauri/src/commands/{family}.rs`: cache-aware command using `crate::commands::cached::{lookup, store_view}`. Always wrap the API call in `run_with_ledger` so it shows up in /usage.
5. **Register** — `src-tauri/src/lib.rs::run`: add to `invoke_handler!`.
6. **TS shim** — `src/lib/tauri.ts`: `tauriApi.xyz: invoke(...)`.
7. **TS cost mirror** — `src/lib/cost.ts`: variant + match arm.
8. **UI tab** — `src/routes/{family}/XyzTab.tsx`: form + cost preview + cache badge + refresh button.

The `cached::lookup` + `store_view` helpers handle the 30d/7d/3d/1d TTL tiers from `domain::cache`. Any view type that derives `Serialize + Deserialize` and includes `from_cache: bool` + `fetched_at: Option<String>` works out of the box.

## Background pollers

Three independent tokio tasks spawn on app startup (in `lib::run`):

- **`tasks::poller`** — polls `/v3/serp/google/organic/tasks_ready` every 30s and fetches results for ready Standard-Queue SERP tasks.
- **`tasks::tracker`** — wakes every 60min, pulls due rows from `tracked_keywords` (`frequency` + `last_run_at` driven), runs SERP organic depth 100, finds the target domain rank, appends to `tracking_results`.
- **`tasks::audit_poller`** — wakes every 60s, pulls pending `audit_runs`, calls `/v3/on_page/tasks_ready`, fetches `/summary` + `/pages` for ready tasks, persists.

Failures inside each tick are per-row and log-warned; they don't kill the loop.

## Rate limiter

`src-tauri/src/ratelimit/scheduler.rs` is a per-`Family` token bucket. Every API call goes through `ApiClient::post_json` / `get_json`, which calls `scheduler.acquire(family)` first. Buckets:

- `GoogleAdsLive` — 12 rpm (slowest family)
- `KeywordsData`, `Labs`, `AppData`, `SerpLive` — 60 rpm sustained
- `SerpTask`, `Backlinks`, `DomainAnalytics`, `OnPage`, `ContentAnalysis` — 2000 rpm

## Response cache

Generic key: `(endpoint, canonical-JSON params hash)`. `domain::cache::hash_params` BTreeMap-sorts object keys before serialization so the hash is stable regardless of key order. TTLs are policy:

| Tier | Length | Rationale |
|---|---|---|
| `ttl_long` | 30d | per-keyword volume / KD, registrar info, IAB taxonomy |
| `ttl_medium` | 7d | aggregates that update daily-ish (suggestions, technologies, competitors) |
| `ttl_short` | 3d | competitive snapshots that benefit from freshness (rank overview, intersections, brand mentions) |
| `ttl_volatile` | 1d | rank-sensitive data (ranked_keywords) |

Cache eviction at startup drops `response_cache` rows older than 60d and completed `audit_runs` older than 90d.

## Cost ledger + budget

Every API call lands in `api_calls` (cost_usd, estimated_usd, duration_ms, response_status, error). The Usage page tabulates by endpoint and by day. The `cost_budget` table holds optional daily/monthly caps; the BudgetCard polls every 30s and shows ok/alert/exceeded.

## Multi-domain projects

`projects` table groups `tracked_keywords` and `audit_runs` by a logical owner via nullable `project_id`. The `useProject()` React context loads the list at startup and persists the active id in localStorage. ProjectSwitcher in the sidebar lets the user create/select/delete projects; pages prefill their target input from the active project.

## Files of note

- `src-tauri/src/lib.rs` — startup sequence (DB init → eviction → backfill → spawn pollers → register commands)
- `src-tauri/src/state.rs` — `AppState` shared across commands (ApiClient + Store)
- `src-tauri/src/api/client.rs` — DataForSEO HTTP client + auth + rate-limit gate
- `src-tauri/src/commands/cached.rs` — generic `lookup` + `store_view` helpers
- `src-tauri/src/commands/ledger.rs` — `run_with_ledger` wrapper that times every call and writes to `api_calls`
- `src-tauri/src/domain/cost.rs` — `CostAction` enum + `estimate()` (mirrored in TS)
- `src/lib/tauri.ts` — single source of truth for the JS-side API surface
- `src/lib/project-store.tsx` — React context for projects
- `src/lib/errors.ts` — `formatError()` that turns AppError shapes into user-friendly toasts

## Testing

- Rust: `cargo test --workspace` (unit tests in `domain/`, `cache/`, `ratelimit/` modules)
- Frontend: `npx vitest run` (cost calc + export utility tests)
- CI: `.github/workflows/dataforseo-app-ci.yml` runs frontend + rust + tauri build smoke on every PR touching `apps/dataforseo-app/**`.
