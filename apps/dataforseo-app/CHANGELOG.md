# Changelog

All notable changes to the DataForSEO desktop app are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-03

First production release. Feature-complete SEMrush replacement on top of
DataForSEO at ~15× lower running cost.

### Added — DataForSEO API surface (~60 endpoints)
- **Keywords / Labs**: search volume, suggestions, related, for-domain,
  ranked, domain rank overview, bulk KD, SERP competitors, competitors-
  domain, domain intersection, bulk search volume, keyword gap, keyword
  overview, search intent, historical rank overview, subdomains, relevant
  pages, page intersection, keyword ideas, top searches, categories.
- **SERP**: organic Live + Bing + AI Mode, ads, news, maps,
  autocomplete, AI Overview, Standard-Queue task post + status.
- **Backlinks**: summary, detail, referring domains/networks, anchors,
  history, domain intersection, domain pages, page intersection, bulk
  (backlinks/refdomains/ranks/spam-score/new-lost), domain pages summary,
  available filters.
- **On-Page**: instant audit, lighthouse, full crawl + 11 sub-endpoints
  (pages, resources, duplicate tags/content, links, non-indexable,
  redirect chains, microdata, keyword density, content parsing).
- **Domain Analytics**: WHOIS overview, technologies, domains-by-tech
  reverse lookup, aggregation across domain lists.
- **Brand Monitor**: search, summary, sentiment, rating distribution,
  phrase trends, category trends.
- **Google Trends + Ads**: explore, keywords-for-site, keywords-for-keywords.
- **App Data**: Google Play + App Store searches and reviews.
- **Topic research, Domain Compare, Appendix status/errors**.

### Added — App-level features
- Visual filter builder (group/condition AST, op-aware value inputs)
  for Backlinks tabs; presets remain as one-click seeders.
- Multi-domain projects: sidebar switcher + auto-prefill across pages,
  with idempotent backfill at startup for pre-projects history.
- Scheduled PDF reports: hourly background task generates A4 multi-page
  PDFs (printpdf, pure-Rust, no system deps) into Documents folder;
  configurable per-project per-kind schedules with run history.
- First-run onboarding wizard (DataForSEO sign-up → credentials →
  budget → first project).
- ExportMenu (CSV/JSON download) on every data tab.
- Cost ledger + daily/monthly budget with alert thresholds.
- Background pollers: SERP Standard-Queue, position tracker (hourly),
  audit poller (60 s), report generator (hourly).
- Full Anthropic chat integration with prompt templates.

### Added — Quality / hygiene
- 12 frontend test files / 74 vitest cases covering errors, format,
  cost, telemetry, i18n, FilterBuilder, ExportMenu, CacheBadge,
  CostPreview, ResultsTable, BudgetCard.
- Rust workspace tests for `domain/`, `cache/`, `ratelimit/`, plus
  ts-rs export round-trips.
- Full CI: `dataforseo-app-ci.yml` runs frontend + Rust + Tauri build
  smoke on every PR touching `apps/dataforseo-app/**`. Rust job tees
  clippy + cargo-test output and uploads logs as artifact on failure.
- i18n with `react-i18next` + browser language detector; DE default,
  EN secondary; bundled JSON, no async loading.
- Structured `formatError(e, context?)` funnel mapping the Rust
  `AppError` enum (Auth/Api/Validation/Parse/Database/Internal) into
  user-friendly strings with hints for known DataForSEO status codes.
- ErrorBoundary wrapping the route tree.
- Sentry crash reporting (off by default; gated on
  `VITE_SENTRY_DSN` + user opt-in; credentials scrubber on every
  event and breadcrumb).
- Architecture docs (`docs/ARCHITECTURE.md`) covering process model,
  cache TTL tiers, rate-limit families, schema overview.

### Performance / cost
- Per-family token-bucket rate limiter (12 / 60 / 2000 rpm tiers).
- Generic response cache with stable param hash + 30 d / 7 d / 3 d / 1 d
  TTL tiers; auto-evict `response_cache > 60 d` and completed
  `audit_runs > 90 d` at startup.
- Standard-Queue task path for SERP delivers ~3.3× lower per-call cost
  vs Live for non-time-critical lookups.

[0.1.0]: https://github.com/xrey167/.github/releases/tag/v0.1.0
