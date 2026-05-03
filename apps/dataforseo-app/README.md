# DataForSEO Desktop

A Tauri desktop app that wraps the entire DataForSEO API surface as a SEMrush-replacement at ~15× lower running cost.

## Highlights

- **Full SEMrush feature parity** — Domain Overview · Keyword Research · Backlinks · Site Audit · Position Tracking · Topic Research / Content Brief · Brand Monitoring · Competitive Research · Keyword Gap.
- **37+ DataForSEO endpoints** wired across Keywords Data, Labs, SERP, Backlinks, Domain Analytics, On-Page, Content Analysis, App Data, and Appendix families.
- **Cost-aware by default** — every action shows an estimated cost preview, and a daily/monthly budget tracker warns + caps spend.
- **Aggressive caching** — generic response cache (TTL tiers: 30d / 7d / 3d / 1d) plus per-endpoint bespoke caches. Repeat lookups within the TTL are free.
- **Multi-domain projects** — group tracked keywords + audits by client; sidebar switcher prefilters every page.
- **Local-first** — all data lives in DuckDB on disk; no remote server, no telemetry by default.

## Install (dev)

```sh
cd apps/dataforseo-app
npm install
cargo tauri dev
```

System deps (Linux): `libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev librsvg2-dev libayatana-appindicator3-dev`.

## First run

A 4-step onboarding wizard runs on first launch (or any time
`tauriApi.testConnection` fails with an auth-shaped error):

1. **Welcome** — DataForSEO sign-up link + 50 USD deposit / 100 USD/mo
   Backlinks-family minimums called out up front.
2. **Credentials** — API login + password. Verified live before the wizard
   advances; balance is shown on success.
3. **Budget** — daily USD limit + alert threshold (advisory, doesn't block
   calls). Defaults to 5 USD/day at 80% alert.
4. **First project** — target domain + optional friendly name. Every page
   that takes a target defaults to the active project's domain.

Once you're in the app:

- **Keyword Overview** (Keywords → Overview) — comprehensive single-call
  lookup. The 📊 / 🔍 / 🏢 buttons send the keyword straight to Tracking,
  Site Audit, or Brand Monitor without retyping.
- **Tracking** → add keywords. Background tracker polls SERP organic
  daily / weekly per row.
- **Site Audit** → start a 100-page crawl. Poller fetches /summary +
  /pages once DataForSEO finishes the queue task.
- **Brand Monitor** → search a brand keyword. Summary + Search run in
  parallel; cache hit on the pair = $0.

Re-run the wizard later via **Settings → Setup → Re-run onboarding**.

## Telemetry

Off by default. To opt into crash reports, set `VITE_SENTRY_DSN` at
build time and flip the toggle in **Settings → Crash reports**. Both
gates have to be on or nothing transmits. Credentials and request
payloads are scrubbed before send.

## Cost expectations vs SEMrush

| Workflow | SEMrush Pro | This app (fresh) | Cached |
|---|---|---|---|
| 1k-keyword bulk volume | bundled | $0.10 | $0 |
| Competitor keyword gap | bundled | $0.025 | $0 |
| Site audit (100 pages) | bundled | $0.0125 | $0 |
| Position tracking (100 kw daily) | bundled | $6/mo | n/a |
| Topic research / brief | bundled | $0.022 | $0 |
| Brand monitor (100 mentions) | n/a | $0.10 | $0 |
| **Monthly total typical** | **$140** | **~$8–12** | n/a |

## Pages

- **Keywords** — Volume / Bulk Volume (cheap, $0.0001/kw via Labs) / Suggestions / Related / Difficulty / Overview / Trends / SERP Competitors
- **Topic Research** — orchestrated content brief from suggestions + SERP top-10 + on-page audits
- **SERP** — Organic / Ads / News / Maps / AI Mode / Bing / Autocomplete / AI Overview / Bulk (Standard Queue)
- **Tracking** — daily SERP rank monitoring with 30-day trend chart
- **Domain** — Overview / Keywords for Domain / Ranked / Competitors / Keyword Gap / Intersection
- **Backlinks** — Summary / Detail / Referring Domains / Anchors / History / Link Gap / Domain Pages / Page Intersection / Bulk
- **Domain Analytics** — WHOIS / Tech Stack
- **On-Page** — Instant Pages / Lighthouse
- **Site Audit** — full multi-page crawl with per-page issue table
- **Brand Monitor** — mention search + sentiment + summary
- **Apps** — Google Play + App Store search & reviews
- **Compare** — domain-vs-domain rank comparison
- **Tasks** — Standard Queue dashboard
- **Chat** — bring-your-own-LLM chat with results attached
- **Reports** — scheduled PDF reports (daily-tracking / weekly-audit /
  weekly-brand) generated to your Documents folder
- **Usage** — cost ledger + budget tracker
- **Settings** — credentials + theme + telemetry opt-in

## Data model

DuckDB at `<app local data>/dataforseo-app.duckdb`. Append-only migrations under `src-tauri/migrations/`:

- `v0001_initial`: api_calls ledger + keyword_volume_cache + serp_tasks/results
- `v0002_ai_chat`: chat_sessions + chat_messages
- `v0003_backlinks`: backlinks_summary_cache + saved_filters
- `v0004_response_cache`: generic response_cache (used by 11+ endpoints) + cost_budget
- `v0005_position_tracking`: tracked_keywords + tracking_results (history)
- `v0006_site_audit`: audit_runs + audit_pages
- `v0007_projects`: projects + project_id columns
- `v0008_reports`: report_schedules + report_runs (FK-cascaded)

## Architecture

See `docs/ARCHITECTURE.md` for the Rust ↔ TS boundary, response cache, rate limiter, and background pollers.

## License

Internal / not yet published.
