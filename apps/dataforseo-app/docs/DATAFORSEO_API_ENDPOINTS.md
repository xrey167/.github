# DataForSEO API — Endpoint Catalogue

Exhaustive list of DataForSEO endpoint families and per-endpoint paths, with
implementation status in this app, current pricing (USD per request, as of
2026 Q2), and notes on what each one is good for. The catalogue is the
"all endpoints" reference; the **Status** column tracks what's wired through
the Rust backend and surfaced in the UI.

Status legend:

- **✅ done** — Tauri command, cost ledger, UI surface.
- **🟡 next** — Implementation candidate for an upcoming PR. No
  architectural blockers; just code.
- **🟦 plan** — Future milestone. Needs a UI design / new schema /
  separate cost model.
- **⛔ skip** — Out of scope for this app (e.g. requires a long-running
  pipeline, a niche use case, or a different product surface).
- **n/a** — Sandbox / merchant-facing endpoint we have no use case for.

Pricing notation:

- `Live` rows are the synchronous-response variants (`/live`).
- `Standard` is the queued variant (`task_post` → `tasks_ready` →
  `task_get`); typically one third of Live cost.
- `Priority` is a faster queue (typically 2× standard).
- Per-row costs (where applicable) are listed in parentheses.

## Keywords Data API

Google Ads search-volume data and clickstream-derived stats.

| Endpoint | Path | Live | Standard | Status |
| --- | --- | --- | --- | --- |
| Google Ads · Search Volume | `/v3/keywords_data/google_ads/search_volume/live` | 0.075 / 1k kw | 0.05 / 1k | ✅ done |
| Google Ads · Keywords for Site | `/v3/keywords_data/google_ads/keywords_for_site/live` | 0.075 | 0.05 | 🟡 next |
| Google Ads · Keywords for Keywords | `/v3/keywords_data/google_ads/keywords_for_keywords/live` | 0.075 | 0.05 | 🟡 next |
| Google Ads · Ad Traffic by Keywords | `/v3/keywords_data/google_ads/ad_traffic_by_keywords/live` | 0.075 | 0.05 | 🟦 plan |
| Google Trends · Explore | `/v3/keywords_data/google_trends/explore/live` | 0.05 | — | 🟡 next |
| Google Trends · Categories | `/v3/keywords_data/google_trends/categories` | 0.0001 | — | 🟦 plan |
| Bing · Keyword Performance | `/v3/keywords_data/bing/keyword_performance/live` | 0.05 | — | 🟦 plan |
| Bing · Search Volume | `/v3/keywords_data/bing/search_volume/live` | 0.05 | — | 🟦 plan |
| Bing · Locations | `/v3/keywords_data/bing/locations` | free | — | n/a |
| Clickstream · Bulk Search Volume | `/v3/keywords_data/clickstream_data/bulk_search_volume/live` | 0.0006 / kw | — | 🟡 next |
| Clickstream · Dataforseo Search Volume | `/v3/keywords_data/dataforseo_trends/explore/live` | 0.05 | — | 🟦 plan |

## DataForSEO Labs API

Aggregated competitive-intel data (no real-time SERP scraping, derived from
DataForSEO's own crawl).

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Google · Keyword Suggestions | `/v3/dataforseo_labs/google/keyword_suggestions/live` | 0.0125 | ✅ done |
| Google · Related Keywords | `/v3/dataforseo_labs/google/related_keywords/live` | 0.0125 / depth | ✅ done |
| Google · Keywords for Site | `/v3/dataforseo_labs/google/keywords_for_site/live` | 0.0125 | ✅ done |
| Google · Ranked Keywords | `/v3/dataforseo_labs/google/ranked_keywords/live` | 0.0125 | ✅ done |
| Google · SERP Competitors | `/v3/dataforseo_labs/google/serp_competitors/live` | 0.0125 | ✅ done |
| Google · Competitors Domain | `/v3/dataforseo_labs/google/competitors_domain/live` | 0.0125 | ✅ done |
| Google · Domain Intersection | `/v3/dataforseo_labs/google/domain_intersection/live` | 0.0125 | ✅ done |
| Google · Subdomains | `/v3/dataforseo_labs/google/subdomains/live` | 0.0125 | 🟦 plan |
| Google · Relevant Pages | `/v3/dataforseo_labs/google/relevant_pages/live` | 0.0125 | 🟦 plan |
| Google · Page Intersection | `/v3/dataforseo_labs/google/page_intersection/live` | 0.0125 | 🟦 plan |
| Google · Domain Rank Overview | `/v3/dataforseo_labs/google/domain_rank_overview/live` | 0.0125 | ✅ done |
| Google · Historical Rank Overview | `/v3/dataforseo_labs/google/historical_rank_overview/live` | 0.0125 | 🟦 plan |
| Google · Bulk Keyword Difficulty | `/v3/dataforseo_labs/google/bulk_keyword_difficulty/live` | 0.0001 / kw | ✅ done |
| Google · Bulk Search Volume | `/v3/dataforseo_labs/google/bulk_search_volume/live` | 0.0001 / kw | ✅ done |
| Google · Search Intent | `/v3/dataforseo_labs/google/search_intent/live` | 0.0125 | 🟡 next |
| Google · Keyword Overview | `/v3/dataforseo_labs/google/keyword_overview/live` | 0.0125 | 🟡 next |
| Google · Keyword Ideas | `/v3/dataforseo_labs/google/keyword_ideas/live` | 0.0125 | 🟦 plan |
| Google · Categories For Domain | `/v3/dataforseo_labs/google/categories_for_domain/live` | 0.0001 | 🟦 plan |
| Google · Categories For Keywords | `/v3/dataforseo_labs/google/categories_for_keywords/live` | 0.0001 | 🟦 plan |
| Google · Top Searches | `/v3/dataforseo_labs/google/top_searches/live` | 0.0125 | 🟦 plan |
| Bing variants | `/v3/dataforseo_labs/bing/...` (mirror of Google) | 0.0125 | 🟦 plan |
| Amazon variants | `/v3/dataforseo_labs/amazon/...` | 0.0125 | 🟦 plan |
| Locations / Languages | `/v3/dataforseo_labs/google/locations_and_languages` | free | n/a |

## SERP API

Real-time SERP scraping. The Live and Task variants return identical
schemas; Live is faster but ~3.3× more expensive. Per-page depth (10/20/
.../100) multiplies the cost; extra params (`load_async_ai_overview`,
`people_also_ask_click_depth`, `calculate_rectangles`) multiply by 5×
each.

| Endpoint | Path | Live (per row) | Standard | Status |
| --- | --- | --- | --- | --- |
| Google · Organic | `/v3/serp/google/organic/{live,task_post,task_get/...}` | 0.002 | 0.0006 | ✅ done |
| Google · Organic AI Mode | `/v3/serp/google/ai_mode/{live,task_post,...}` | 0.002 | 0.0006 | 🟡 next |
| Google · Ads | `/v3/serp/google/ads/{live,task_post,...}` | 0.002 | 0.0006 | ✅ done |
| Google · News | `/v3/serp/google/news/{live,task_post,...}` | 0.002 | 0.0006 | ✅ done |
| Google · Maps | `/v3/serp/google/maps/{live,task_post,...}` | 0.002 | 0.0006 | ✅ done |
| Google · Local Pack | `/v3/serp/google/local_pack/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| Google · Images | `/v3/serp/google/images/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| Google · Events | `/v3/serp/google/events/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| Google · Jobs | `/v3/serp/google/jobs/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| Google · Finance Explore | `/v3/serp/google/finance_explore/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Google · Trends · Explore | `/v3/serp/google/google_trends_explore/{live,...}` | 0.002 | 0.0006 | 🟦 plan |
| Google · Hotels | `/v3/serp/google/hotels/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Google · Flights | `/v3/serp/google/flights/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Google · Autocomplete | `/v3/serp/google/autocomplete/{live,task_post,...}` | 0.002 | 0.0006 | 🟡 next |
| Google · Dataset | `/v3/serp/google/dataset_info/{live,...}` | 0.002 | — | ⛔ skip |
| Google · Books | `/v3/serp/google/books/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Bing · Organic | `/v3/serp/bing/organic/{live,task_post,...}` | 0.002 | 0.0006 | 🟡 next |
| Bing · Local Pack | `/v3/serp/bing/local_pack/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| Yahoo · Organic | `/v3/serp/yahoo/organic/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| YouTube · Organic | `/v3/serp/youtube/organic/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| YouTube · Video Info | `/v3/serp/youtube/video_info/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| YouTube · Video Subtitles | `/v3/serp/youtube/video_subtitles/{live,task_post,...}` | 0.002 | 0.0006 | 🟦 plan |
| Naver · Organic | `/v3/serp/naver/organic/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Seznam · Organic | `/v3/serp/seznam/organic/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Baidu · Organic | `/v3/serp/baidu/organic/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| Yandex · Organic | `/v3/serp/yandex/organic/{live,task_post,...}` | 0.002 | 0.0006 | ⛔ skip |
| AI Overview · Live | `/v3/serp/google/ai_overview/live/...` | 0.0001 / pull | — | 🟡 next |

> Note: Standard queue endpoints follow the pattern `task_post → tasks_ready
> → task_get/{advanced,html,regular,...}`. The poller in `tasks::poller`
> handles the lifecycle; per-search-engine variants only need a new
> `task_post` URL and a `task_get` URL.

## Backlinks API

Aggregate and per-link inbound-link data. 100 USD/month minimum spend
across this family (DataForSEO restriction).

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Summary | `/v3/backlinks/summary/live` | 0.02 + 0.00003/row | ✅ done |
| Backlinks (detail) | `/v3/backlinks/backlinks/live` | 0.02 + 0.00003/row | ✅ done |
| Referring Domains | `/v3/backlinks/referring_domains/live` | 0.02 + 0.00003/row | ✅ done |
| Anchors | `/v3/backlinks/anchors/live` | 0.02 + 0.00003/row | ✅ done |
| History | `/v3/backlinks/history/live` | 0.02 + 0.00003/row | ✅ done |
| Domain Intersection (Link Gap) | `/v3/backlinks/domain_intersection/live` | 0.02 + 0.00003/row | ✅ done |
| Page Intersection | `/v3/backlinks/page_intersection/live` | 0.02 + 0.00003/row | 🟡 next |
| Domain Pages | `/v3/backlinks/domain_pages/live` | 0.02 + 0.00003/row | 🟡 next |
| Domain Pages Summary | `/v3/backlinks/domain_pages_summary/live` | 0.02 + 0.00003/row | 🟦 plan |
| Referring Networks | `/v3/backlinks/referring_networks/live` | 0.02 + 0.00003/row | 🟦 plan |
| Bulk Backlinks | `/v3/backlinks/bulk_backlinks/live` | 0.02 / target | 🟦 plan |
| Bulk Referring Domains | `/v3/backlinks/bulk_referring_domains/live` | 0.02 / target | 🟦 plan |
| Bulk Ranks | `/v3/backlinks/bulk_ranks/live` | 0.02 / target | 🟦 plan |
| Bulk Spam Score | `/v3/backlinks/bulk_spam_score/live` | 0.02 / target | 🟦 plan |
| Bulk New / Lost | `/v3/backlinks/bulk_new_lost_backlinks/live` | 0.02 / target | 🟦 plan |
| Available Filters | `/v3/backlinks/available_filters` | free | 🟦 plan (drives builder UI) |
| Errors | `/v3/backlinks/errors` | free | 🟦 plan (debugging) |

## On-Page API

Site-wide audits — Lighthouse, content parsing, link graphs. Live variants
are single-page; the Task variants run a multi-page crawl.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Instant Pages | `/v3/on_page/instant_pages` | 0.0025 / page | ✅ done |
| Lighthouse · Live · JSON | `/v3/on_page/lighthouse/live/json` | 0.0025 | ✅ done |
| Lighthouse · Audits | `/v3/on_page/lighthouse/audits` | free | 🟦 plan |
| Lighthouse · Versions | `/v3/on_page/lighthouse/versions` | free | n/a |
| Task Post (full crawl) | `/v3/on_page/task_post` | 0.000125 / page | ✅ done |
| Summary | `/v3/on_page/summary/{id}` | free | ✅ done |
| Tasks Ready | `/v3/on_page/tasks_ready` | free | ✅ done |
| Pages | `/v3/on_page/pages` | free (rolled into task_post) | ✅ done |
| Pages By Resource | `/v3/on_page/pages_by_resource` | 0.0001 / row | 🟦 plan |
| Resources | `/v3/on_page/resources` | 0.0001 / row | 🟦 plan |
| Duplicate Tags | `/v3/on_page/duplicate_tags` | 0.0001 / row | 🟦 plan |
| Duplicate Content | `/v3/on_page/duplicate_content` | 0.0001 / row | 🟦 plan |
| Links | `/v3/on_page/links` | 0.0001 / row | 🟦 plan |
| Non-indexable | `/v3/on_page/non_indexable` | 0.0001 / row | 🟦 plan |
| Redirect Chains | `/v3/on_page/redirect_chains` | 0.0001 / row | 🟦 plan |
| Microdata | `/v3/on_page/microdata` | 0.0001 / row | 🟦 plan |
| Keyword Density | `/v3/on_page/keyword_density` | 0.0001 / row | 🟦 plan |
| Content Parsing · Live | `/v3/on_page/content_parsing/live` | 0.0025 | 🟦 plan |

## Domain Analytics API

Tech-stack and WHOIS lookups. Tiny, cheap, useful for one-off audits.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Technologies · Domain Technologies | `/v3/domain_analytics/technologies/domain_technologies/live` | 0.001 | ✅ done |
| Technologies · Available Filters | `/v3/domain_analytics/technologies/available_filters` | free | n/a |
| Technologies · Domains by Technology | `/v3/domain_analytics/technologies/domains_by_technology/live` | 0.001 | 🟦 plan |
| Technologies · Aggregation | `/v3/domain_analytics/technologies/aggregation_technologies/live` | 0.001 | 🟦 plan |
| Whois · Overview | `/v3/domain_analytics/whois/overview/live` | 0.0001 | ✅ done |
| Whois · Available Filters | `/v3/domain_analytics/whois/available_filters` | free | n/a |

## Content Analysis API

Brand-mention monitoring across the open web.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Search | `/v3/content_analysis/search/live` | 0.001 / row | 🟦 plan |
| Summary | `/v3/content_analysis/summary/live` | 0.001 | 🟦 plan |
| Sentiment Analysis | `/v3/content_analysis/sentiment_analysis/live` | 0.0005 / row | 🟦 plan |
| Rating Distribution | `/v3/content_analysis/rating_distribution/live` | 0.0005 | 🟦 plan |
| Phrase Trends | `/v3/content_analysis/phrase_trends/live` | 0.0005 / row | 🟦 plan |
| Categories | `/v3/content_analysis/category_trends/live` | 0.0005 | 🟦 plan |

## Content Generation API

LLM-backed text generation. We run our own Anthropic / OpenAI providers
through the AI panel — DataForSEO's content gen would be a fallback only.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Generate | `/v3/content_generation/generate/live` | 0.005 / 1k tok | ⛔ skip |
| Generate Sub-topics | `/v3/content_generation/generate_sub_topics/live` | 0.005 | ⛔ skip |
| Generate Meta Tags | `/v3/content_generation/generate_meta_tags/live` | 0.005 | ⛔ skip |
| Paraphrase | `/v3/content_generation/paraphrase/live` | 0.005 | ⛔ skip |
| Check Grammar | `/v3/content_generation/check_grammar/live` | 0.001 | ⛔ skip |
| Text Summary | `/v3/content_generation/text_summary/live` | 0.005 | ⛔ skip |

## Merchant API

Marketplace SERPs and product info.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Amazon · Products | `/v3/merchant/amazon/products/{live,task_post,...}` | 0.002 | 🟦 plan |
| Amazon · Sellers | `/v3/merchant/amazon/sellers/{live,task_post,...}` | 0.002 | 🟦 plan |
| Amazon · ASIN | `/v3/merchant/amazon/asin/{live,task_post,...}` | 0.002 | 🟦 plan |
| Google Shopping · Products | `/v3/merchant/google/products/{live,task_post,...}` | 0.002 | 🟦 plan |
| Google Shopping · Sellers | `/v3/merchant/google/sellers/{live,task_post,...}` | 0.002 | 🟦 plan |

## App Data API

Mobile app store SERPs and app metadata.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Google Play · App Searches | `/v3/app_data/google/app_searches/{live,task_post,...}` | 0.002 | 🟦 plan |
| Google Play · App Reviews | `/v3/app_data/google/app_reviews/{live,task_post,...}` | 0.002 | 🟦 plan |
| App Store · App Searches | `/v3/app_data/apple/app_searches/{live,task_post,...}` | 0.002 | 🟦 plan |
| App Store · App Reviews | `/v3/app_data/apple/app_reviews/{live,task_post,...}` | 0.002 | 🟦 plan |

## Business Data API

Local business data and reviews — TripAdvisor, Yelp, Google My Business.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| Google · My Business Info | `/v3/business_data/google/my_business_info/{live,task_post,...}` | 0.0025 | 🟦 plan |
| Google · My Business Updates | `/v3/business_data/google/my_business_updates/{live,task_post,...}` | 0.0025 | 🟦 plan |
| Google · Reviews | `/v3/business_data/google/reviews/{live,task_post,...}` | 0.002 | 🟦 plan |
| Google · Hotels Info | `/v3/business_data/google/hotels/info/{live,task_post,...}` | 0.002 | ⛔ skip |
| Google · Questions Search | `/v3/business_data/google/questions_search/{live,task_post,...}` | 0.002 | 🟦 plan |
| Google · Extended Reviews | `/v3/business_data/google/extended_reviews/{live,task_post,...}` | 0.002 | 🟦 plan |
| TripAdvisor · Search | `/v3/business_data/tripadvisor/search/{live,task_post,...}` | 0.002 | ⛔ skip |
| TripAdvisor · Reviews | `/v3/business_data/tripadvisor/reviews/{live,task_post,...}` | 0.002 | ⛔ skip |
| Trustpilot · Search | `/v3/business_data/trustpilot/search/{live,task_post,...}` | 0.002 | 🟦 plan |
| Trustpilot · Reviews | `/v3/business_data/trustpilot/reviews/{live,task_post,...}` | 0.002 | 🟦 plan |
| Yelp · Search | `/v3/business_data/yelp/search/{live,task_post,...}` | 0.002 | 🟦 plan |
| Social Media · Pinterest | `/v3/business_data/social_media/pinterest/live` | 0.0001 | 🟦 plan |
| Social Media · Facebook | `/v3/business_data/social_media/facebook/live` | 0.0001 | 🟦 plan |
| Social Media · Reddit | `/v3/business_data/social_media/reddit/live` | 0.0001 | 🟦 plan |

## AI Optimization API

Newer family that tracks AI Overview / SGE / Perplexity-style answer
inclusion. Pricing model still in flux at DataForSEO; we'll wire it once
the prices stabilise.

| Endpoint | Path | Live | Status |
| --- | --- | --- | --- |
| ChatGPT · LLM Responses | `/v3/ai_optimization/chat_gpt/llm_responses/live` | 0.005 / call | 🟦 plan |
| Perplexity · LLM Responses | `/v3/ai_optimization/perplexity/llm_responses/live` | 0.005 | 🟦 plan |
| Gemini · LLM Responses | `/v3/ai_optimization/gemini/llm_responses/live` | 0.005 | 🟦 plan |
| Claude · LLM Responses | `/v3/ai_optimization/claude/llm_responses/live` | 0.005 | 🟦 plan |
| AI Keyword Data · Search Volume | `/v3/ai_optimization/ai_keyword_data/keyword_data/live` | 0.0001 / kw | 🟦 plan |

## Account / Appendix endpoints

Always free. Used by the auth + diagnostics flows.

| Endpoint | Path | Status |
| --- | --- | --- |
| User Data | `/v3/appendix/user_data` | ✅ done (auth.test_connection) |
| Errors | `/v3/appendix/errors` | 🟦 plan |
| Status | `/v3/appendix/status` | 🟦 plan |
| Webhook | `/v3/appendix/webhook/{post,delete}` | ⛔ skip |

---

## Implementation roadmap

### Position Tracking

Built on top of SERP organic Live (already implemented). The
`tracked_keywords` + `tracking_results` tables and the `tasks/tracker.rs`
background runner give SEMrush-style daily rank monitoring without an
extra DataForSEO endpoint.

### Roadmap (older entries — kept for reference)

After this PR (Domain Intersection), the suggested order for the next batch
is:

1. **Backlinks · page_intersection + domain_pages** (closes Backlinks
   Phase 2 entirely; reuses the existing tab shell).
2. **Domain Analytics · whois + technologies** (small new page, two
   cheap endpoints, gives users a quick "what's this domain running"
   answer).
3. **Labs · domain_rank_overview + bulk_keyword_difficulty** (rounds
   out the keyword research path with the SEMrush "domain overview"
   tile).
4. **SERP · ads + news + maps** (extra SERP variants; same pipeline as
   organic, just new task_post URLs).
5. **On-Page · instant_pages + lighthouse** (one-page audits without
   a full crawl; useful as a chat-attached diagnostic).
6. **AI Optimization** (whole family) once DataForSEO stabilises prices.
7. **Visual filter-builder UI** for the Backlinks family (replaces
   the preset dropdown in the Detail tab).

Each of those is a single PR's worth of work and each can be reviewed
without blocking the others.
