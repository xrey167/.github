# User Guide — DataForSEO Desktop

> **Who this is for**: SEO consultants, agencies, and in-house marketers
> who need the full SEMrush feature surface but balk at the $140–500/mo
> seat price. This app sits on top of DataForSEO (a metered API priced
> at fractions of a cent per call) and ships every SEMrush workflow as
> a native desktop app — local data, BYO API keys, ~15× lower running
> cost on a typical agency workload.

---

## Table of contents

1. [What this app is for](#what-this-app-is-for)
2. [How the cost model works](#how-the-cost-model-works)
3. [The eight core workflows](#the-eight-core-workflows)
   - [Keyword research](#1-keyword-research)
   - [Topic research / content brief](#2-topic-research--content-brief)
   - [Position tracking](#3-position-tracking)
   - [Site audit](#4-site-audit)
   - [Backlink analysis](#5-backlink-analysis)
   - [Brand monitoring](#6-brand-monitoring)
   - [Competitive research](#7-competitive-research)
   - [Scheduled reporting](#8-scheduled-reporting)
4. [Cost & budget management](#cost--budget-management)
5. [Multi-client (project) workflow](#multi-client-project-workflow)
6. [Caching & freshness](#caching--freshness)
7. [Exports & PDF reports](#exports--pdf-reports)
8. [The AI assistant](#the-ai-assistant)
9. [FAQ](#faq)

---

## What this app is for

You'd use this app instead of SEMrush / Ahrefs / Sistrix when:

- You bill clients hourly and the $140/mo seat is line-item awkward.
- You only need 2–3 SEMrush workflows but pay for the whole bundle.
- You want raw data files (CSV/JSON) that paste into Looker Studio /
  Sheets / Excel, not a hosted dashboard you have to log into.
- Your data residency / GDPR posture wants the keyword history on a
  laptop, not on a vendor's server.
- You handle 5+ client domains and want them as first-class
  "projects" instead of separate dashboards.

The app does **not** replace:
- Hosted reporting portals you give clients direct access to.
  (Use the scheduled PDF reports for that handoff instead.)
- Real-time rank trackers running 24/7 in the cloud — the position
  tracker only runs while the app is open or via a daily-launch
  scheduled task.

## How the cost model works

DataForSEO bills per call, with most lookups in the **$0.0001 –
$0.002** range and bulk endpoints discounted further. The app makes
this transparent in three places:

1. **Cost preview** — every page that triggers a paid call shows an
   estimated $ figure before you click Run. The estimate matches the
   actual bill within a cent for non-Bulk endpoints.
2. **Cache badges** — pages mark results as `live` (just fetched) or
   `cached: 2h ago` (free re-fetch within TTL). 30d / 7d / 3d / 1d
   cache tiers per endpoint family.
3. **Usage tab** — daily / weekly / monthly cost totals broken down by
   endpoint, plus a budget bar. Every API call is logged with its
   actual cost so the figure is exact, not estimated.

A typical agency workload (5 client domains × monthly rank tracking +
audit + occasional keyword research) lands at **$8–12/mo** total —
compared to $140–500/mo for the equivalent SEMrush seat.

## The eight core workflows

### 1. Keyword research

**Use when**: you have a seed term or an existing piece of content and
need keywords to write around / target / rank for.

**Pages**: Keywords → Volume / Suggestions / Related / Difficulty /
Overview / Trends / SERP Competitors / Bulk Volume

**Recommended flow**:

1. Start at **Keywords → Overview**. Enter the seed keyword. One call
   ($0.0125) returns volume, KD, CPC, search intent, and the SERP
   feature signals (featured snippet, PAA, AI overview, etc.) all at
   once. This replaces 4–5 separate Labs calls in the old workflow.
2. Click 📊 **Track** on the result row to drop the keyword into the
   Position Tracking page (no retyping, the project context auto-fills).
3. From the same page, click **Suggestions** to expand into long-tails.
   Suggestions → 200 keywords for $0.075. Export the lot via the CSV /
   JSON button or run **Bulk Volume** (cheap — $0.0001/kw via Labs) on
   500 of them at once.
4. Use **Trends** (Google Trends, $0.05 flat fee) to compare interest
   over time across up to 5 keywords — useful for seasonality calls.

**When to use which**:
- **Suggestions** → you have one seed, need a long-tail tree.
- **Related** → same as Suggestions but semantic neighbours, not
  prefix-matched.
- **Keyword Ideas / Top Searches** → you want category-wide ideas
  (e.g. all keywords in `/Finance/Investing`).
- **Difficulty / Bulk Volume** → you have a list and need volume +
  KD per row.

### 2. Topic research / content brief

**Use when**: you're commissioning a content piece and need a brief
(target keyword, outline angle, top-10 to beat, length target).

**Page**: Topic Research

This page orchestrates 4 separate calls into one brief:

1. SERP organic top-10 for the target keyword
2. Suggestions (long-tails to weave into H2s/H3s)
3. On-page audit of the top 3 ranking URLs (title, h1, word count)
4. Search-intent classification

The result is a single-page brief that you copy into your CMS or hand
to a writer. About **$0.022 / brief** in API spend.

### 3. Position tracking

**Use when**: a client wants weekly proof that the work is moving
ranks.

**Page**: Tracking

**Setup**:

1. Pick or create a project for the client (sidebar → + New project).
2. On the Tracking page, hit **+ Add keyword**. Pick the target
   domain (auto-fills from the active project), enter the keyword,
   choose frequency (daily / weekly / monthly).
3. Repeat for the keyword set. 100 keywords daily = ~$6/mo.

**Background behaviour**:

- The tracker wakes hourly. For each row whose `frequency` interval
  has elapsed since `last_run_at`, it runs a SERP organic depth-100
  call, finds the target domain in the result, and appends a row to
  `tracking_results`.
- The trend line on each row shows the last 30 days. Click ↻ to force
  an immediate re-check (bypasses the schedule).
- Failed checks (rate-limited, target temporarily down) skip with a
  warning log; they don't kill the loop.

**Anti-pattern**: don't track 1000+ keywords daily — that's the
wrong tool. Use weekly cadence + scheduled PDF reports for that
volume.

### 4. Site audit

**Use when**: pre-launch, post-migration, quarterly health-check,
or "why did organic fall off a cliff" debugging.

**Page**: Site Audit

**Flow**:

1. Click **+ Start audit**. Enter the target domain + crawl page
   limit (default 100). Optionally restrict by sitemap or path.
2. The audit goes onto the DataForSEO Standard Queue. The audit
   poller wakes every 60s; when DataForSEO finishes the crawl, it
   pulls /summary + /pages and stores them locally.
3. The list view shows pending / in-progress / completed runs. Click
   in for the per-page table sorted by lowest on-page score.
4. The eleven On-Page sub-endpoints (Pages, Pages by Resource,
   Resources, Duplicate Tags, Duplicate Content, Links, Non-Indexable,
   Redirect Chains, Microdata, Keyword Density, Content Parsing) are
   lazy-loaded via the drill-down — each is $0.0001/row, cached 7 days.

**Cost**: 100 pages = $0.0125. 1k pages = $0.125.

**Cleanup**: completed audits older than 90 days auto-evict at
startup so the DB doesn't bloat.

### 5. Backlink analysis

**Use when**: link gap analysis, competitor link mining, lost-link
recovery, broken-link prospecting, "is this an honest domain"
sanity check.

**Page**: Backlinks

**Tabs**:

- **Summary** — domain rank, ref domains, ref pages, top-line stats.
  $0.02 / lookup.
- **Detail** — every backlink with anchor, source/target URLs,
  follow / nofollow, first-seen / last-seen. Filterable via the
  visual filter builder (see below). $0.0006 / row.
- **Referring Domains / Networks** — aggregate view by domain or
  by network (groups domains owned by the same registrant).
- **Anchors / History / Domain Pages / Page Intersection** —
  specialised cuts.
- **Bulk** — array-of-targets endpoints. Paste 50 domains, get
  metrics for all 50 in one call. Cheaper per-target than 50 single
  calls.

**Visual filter builder**:

Backlinks Detail is the page where the filter builder shines. Drop
in conditions like `dofollow = true AND domain_from_rank > 30 AND
first_seen > 2024-01-01`. Group with explicit AND/OR. Save the
filter as a named preset for re-use.

The three legacy presets ("Dofollow only", "Domain rank > 30",
"Lost links") still exist as one-click seed buttons that populate
the builder.

### 6. Brand monitoring

**Use when**: you want to know who's mentioning a brand name across
search results without setting up a Google Alert.

**Page**: Brand Monitor

**Flow**:

1. Enter a brand keyword.
2. The page runs Search + Summary + Sentiment in parallel. Cache
   hit on the trio = $0. Fresh = $0.10 / 100 mentions.
3. Each mention shows source URL, snippet, sentiment chip
   (positive / neutral / negative), and rating distribution.

**Cards**:
- **Rating Distribution** — histogram of star ratings across all
  mentions in the result set.
- **Phrase Trends** — co-occurring phrases ranked by rising-tide.
  Useful for spotting the angle of new mentions.
- **Category Trends** — IAB taxonomy categorisation of mention
  contexts.

### 7. Competitive research

**Use when**: pitching a new client, keyword-gap analysis, "what
keywords does the competitor rank for that we don't".

**Pages**: Domain · Compare · Domain Analytics

**Flow**:

1. **Domain → Overview** for your target domain. Shows organic + paid
   keyword counts, traffic estimate, top-keyword preview.
2. **Domain → Competitors** to find the 10–25 closest competitors by
   SERP overlap.
3. **Domain → Keyword Gap** — paste 1–4 competitor domains. Returns
   keywords they rank for that you don't. Sort by `volume × kd_inv`
   for the easiest wins.
4. **Domain → Domain Intersection** — keywords *all* selected domains
   rank for. Useful for "what does the niche care about as a whole".
5. **Domain Analytics → Reverse Tech Lookup** — "who else uses
   Stripe/Shopify/HubSpot". Useful for outreach prospecting.

### 8. Scheduled reporting

**Use when**: clients want a weekly PDF in their inbox, or you want
a paper-trail of historical state.

**Page**: Reports

**Flow**:

1. Pick the active project (sidebar).
2. Reports → **+ Add schedule**. Choose kind:
   - `daily-tracking` — current rank for every tracked keyword on
     the project.
   - `weekly-audit` — latest site-audit summary.
   - `weekly-brand` — brand-monitor summary.
3. The reporter background task wakes every hour. Schedules due
   for their cadence (1 day / 7 days since last run) generate a
   PDF and save it to `<Documents>/DataForSEO Reports/` with a
   timestamped filename.
4. Run history is on the same page — click into a schedule to see
   past PDF paths.

**Note**: PDFs are written locally; emailing / Slack-posting is
intentionally out of scope. The expected workflow is: app generates
PDF → your existing automation (Hazel, Make.com, n8n, a simple cron)
picks it up and dispatches.

## Cost & budget management

**Page**: Usage

**Components**:

- **Top stats** — spend today / this week / this month + last call
  timestamp.
- **Spend by endpoint** — bar chart, last 30 days.
- **Recent calls** — the last 50 API calls with cost, response
  status, and duration. Failed calls are highlighted; click into
  any row for the full request payload.
- **Budget card** — set a daily / monthly limit. The card polls
  every 30s. State badges:
  - `ok` (green) — < alert threshold
  - `alert` (amber) — between alert % and limit
  - `exceeded` (red) — past limit
  - `no_budget` — none set

The budget is **advisory** — it does not block calls. (Hard-blocking
on a budget would lock the user out of the app mid-workflow without
a clear path to "raise the cap and continue", which is worse UX
than the alert.)

**AI tab** (only visible if an Anthropic / OpenAI key is configured)
shows AI-side costs separately, so SEO and AI spend are visible side
by side but never conflated.

## Multi-client (project) workflow

**Why projects exist**: agencies juggle 5–50 client domains. Tracking
each as a flat list of disconnected keywords + audits gets unwieldy
fast. Projects group everything by a logical owner — typically one
client domain.

**Mechanics**:

- The sidebar **Project switcher** is above the nav. Pick a project,
  every page that takes a target domain pre-fills it.
- Tracking and Site Audit list views grow a project filter so you
  can scope the table to one client.
- Reports schedules attach to a project (or `null` for global).
- Deleting a project doesn't drop the tracking / audit history — it
  sets `project_id = NULL` so you can re-attribute later.

**Onboarding**: the first-run wizard asks for an initial project
target. You can rename / add / delete projects later from the
switcher.

## Caching & freshness

The app caches aggressively to keep cost predictable. Each endpoint
family has a TTL:

| Tier | TTL | Used by |
|---|---|---|
| `ttl_long` | 30 d | per-keyword volume / KD, registrar info, IAB taxonomy |
| `ttl_medium` | 7 d | aggregates that update daily-ish (suggestions, technologies, competitors) |
| `ttl_short` | 3 d | competitive snapshots that benefit from freshness (rank overview, intersections) |
| `ttl_volatile` | 1 d | rank-sensitive data (ranked_keywords) |

**Cache badge UI**: every cached page shows a small badge — `live`
(just fetched) or `cached: 2h ago`. The ↻ Refresh button next to it
forces a cache bypass for that page only.

**Cache eviction**: at startup, rows older than 60 days drop. Audit
runs older than 90 days drop. The DB stays compact even after months
of use.

## Exports & PDF reports

**CSV / JSON download**: every data tab has an Export button (top-
right of the result table). Default is CSV; click the menu for
JSON. Filenames are timestamped: `<stem>-<YYYYMMDD-HHMMSS>.csv`.

**PDF reports**: see [Scheduled reporting](#8-scheduled-reporting).

**Chat-with-results**: most data tabs have a "Chat with results"
button that opens the AI assistant pre-loaded with the result set
as context. Useful for "summarise the patterns in this gap analysis"
or "draft an email to the client about these audit findings".

## The AI assistant

**Pages**: Chat (sidebar) + the inline "Chat with results" buttons.

**Setup**: Settings → Add Anthropic / OpenAI API key. Key is stored
in the OS keychain, never the DuckDB file.

**Token cost is logged separately** in the Usage → AI tab, with a
separate cost ledger from the DataForSEO calls. Per-message cost is
shown inline in the chat.

**Prompt templates** ("Quick actions") cover common needs:
cluster keywords, draft titles, write a meta description, summarise
audit issues, draft an outreach email.

**Sessions persist locally**. Every chat session is a row in
`chat_sessions` with the result set attached as JSON (when you used
the "Chat with results" entry point).

## FAQ

**Q: Do I need a DataForSEO subscription?**
Yes — DataForSEO is a metered API. Sign up, fund the wallet ($50
minimum), get the login + password from the dashboard. The app stores
those in the OS keychain.

**Q: Where does the data live?**
On disk in DuckDB at `<app local data>/dataforseo-app.duckdb`.
Nothing leaves the box except API calls to DataForSEO and (if
configured) the Anthropic / OpenAI / Sentry endpoints.

**Q: What if I close the app — does tracking still run?**
No. The hourly tracker only runs while the app is open. For a
24/7 tracker, leave the app running on a server / always-on Mac, or
schedule a daily app launch via cron / launchd / Task Scheduler.

**Q: Can I share a project with a colleague?**
Not directly inside the app. Workaround: the DuckDB file is portable
— copy it. Or use the scheduled PDF reports to hand off snapshots.
A future version may add cloud sync.

**Q: How does this compare to the SEMrush API?**
Different shape. SEMrush sells per-row credits with a monthly cap;
DataForSEO charges per-call with no cap. Per-row cost works out
similar for low volume; DataForSEO is much cheaper at high volume,
SEMrush is sometimes cheaper for one-off small queries (because
some endpoints are bundled into the seat).

**Q: I'm hitting the rate limit.**
The app self-throttles per-family (12 / 60 / 2000 rpm tiers; see
`docs/ARCHITECTURE.md` → Rate limiter). If you're seeing rate-limit
toasts, you're probably running multiple instances of the app
against the same DataForSEO account. Bump the per-family limits in
`ratelimit/scheduler.rs` if you have a higher-tier DataForSEO plan.

**Q: I want to add a new endpoint.**
See `docs/ARCHITECTURE.md` → "Adding a new endpoint" for the 8-step
recipe.

**Q: Where do I report bugs?**
GitHub issues. If crash reports are turned on, Sentry breadcrumbs
arrive scrubbed of credentials.
