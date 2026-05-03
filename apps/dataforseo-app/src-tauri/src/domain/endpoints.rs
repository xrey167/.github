//! Endpoint identifiers as constants. Used as the `endpoint` column value
//! in `api_calls` (the cost ledger). Centralizing them avoids the
//! string-typo class of bugs when the Usage page groups by endpoint.

pub const KEYWORDS_SEARCH_VOLUME: &str = "google_ads.search_volume";
pub const LABS_KEYWORD_SUGGESTIONS: &str = "labs.keyword_suggestions";
pub const LABS_RELATED_KEYWORDS: &str = "labs.related_keywords";
pub const LABS_KEYWORDS_FOR_SITE: &str = "labs.keywords_for_site";
pub const LABS_RANKED_KEYWORDS: &str = "labs.ranked_keywords";
pub const LABS_DOMAIN_RANK_OVERVIEW: &str = "labs.domain_rank_overview";
pub const LABS_BULK_KEYWORD_DIFFICULTY: &str = "labs.bulk_keyword_difficulty";
pub const SERP_GOOGLE_ORGANIC_LIVE: &str = "serp.google.organic.live";
pub const SERP_GOOGLE_ORGANIC_TASK_POST: &str = "serp.google.organic.task_post";
pub const SERP_GOOGLE_ORGANIC_TASK_GET: &str = "serp.google.organic.task_get";
pub const BACKLINKS_SUMMARY: &str = "backlinks.summary";
pub const BACKLINKS_DETAIL: &str = "backlinks.detail";
pub const BACKLINKS_REFERRING_DOMAINS: &str = "backlinks.referring_domains";
pub const BACKLINKS_ANCHORS: &str = "backlinks.anchors";
pub const BACKLINKS_HISTORY: &str = "backlinks.history";
pub const BACKLINKS_DOMAIN_INTERSECTION: &str = "backlinks.domain_intersection";
pub const BACKLINKS_DOMAIN_PAGES: &str = "backlinks.domain_pages";
pub const BACKLINKS_PAGE_INTERSECTION: &str = "backlinks.page_intersection";
pub const DOMAIN_ANALYTICS_WHOIS_OVERVIEW: &str = "domain_analytics.whois.overview";
pub const DOMAIN_ANALYTICS_TECHNOLOGIES: &str = "domain_analytics.technologies.domain";
pub const SERP_GOOGLE_ADS_LIVE: &str = "serp.google.ads.live";
pub const SERP_GOOGLE_NEWS_LIVE: &str = "serp.google.news.live";
pub const SERP_GOOGLE_MAPS_LIVE: &str = "serp.google.maps.live";
pub const LABS_SERP_COMPETITORS: &str = "labs.serp_competitors";
pub const LABS_COMPETITORS_DOMAIN: &str = "labs.competitors_domain";
pub const LABS_DOMAIN_INTERSECTION: &str = "labs.domain_intersection";
pub const ON_PAGE_INSTANT_PAGES: &str = "on_page.instant_pages";
pub const ON_PAGE_LIGHTHOUSE: &str = "on_page.lighthouse";
pub const ON_PAGE_TASK_POST: &str = "on_page.task_post";
pub const LABS_BULK_SEARCH_VOLUME: &str = "labs.bulk_search_volume";
pub const LABS_KEYWORD_OVERVIEW: &str = "labs.keyword_overview";
pub const LABS_SEARCH_INTENT: &str = "labs.search_intent";
pub const TOPIC_RESEARCH: &str = "topic.research";
pub const SERP_GOOGLE_AUTOCOMPLETE: &str = "serp.google.autocomplete";
pub const SERP_GOOGLE_AI_OVERVIEW: &str = "serp.google.ai_overview";
pub const KEYWORDS_TRENDS_EXPLORE: &str = "keywords_data.google_trends.explore";
pub const LABS_CATEGORIES_FOR_DOMAIN: &str = "labs.categories_for_domain";
pub const KEYWORDS_FOR_SITE_GOOGLE_ADS: &str = "google_ads.keywords_for_site";
pub const KEYWORDS_FOR_KEYWORDS_GOOGLE_ADS: &str = "google_ads.keywords_for_keywords";
pub const SERP_GOOGLE_AI_MODE_LIVE: &str = "serp.google.ai_mode.live";
pub const SERP_BING_ORGANIC_LIVE: &str = "serp.bing.organic.live";
pub const CONTENT_ANALYSIS_SEARCH: &str = "content_analysis.search";
pub const CONTENT_ANALYSIS_SUMMARY: &str = "content_analysis.summary";
pub const CONTENT_ANALYSIS_SENTIMENT: &str = "content_analysis.sentiment";

// ---------- Phase A additions ----------
pub const BACKLINKS_BULK_BACKLINKS: &str = "backlinks.bulk_backlinks";
pub const BACKLINKS_BULK_REFERRING_DOMAINS: &str = "backlinks.bulk_referring_domains";
pub const BACKLINKS_BULK_RANKS: &str = "backlinks.bulk_ranks";
pub const BACKLINKS_BULK_SPAM_SCORE: &str = "backlinks.bulk_spam_score";
pub const BACKLINKS_BULK_NEW_LOST: &str = "backlinks.bulk_new_lost_backlinks";
pub const BACKLINKS_REFERRING_NETWORKS: &str = "backlinks.referring_networks";
pub const BACKLINKS_DOMAIN_PAGES_SUMMARY: &str = "backlinks.domain_pages_summary";
pub const BACKLINKS_AVAILABLE_FILTERS: &str = "backlinks.available_filters";

pub const ON_PAGE_PAGES: &str = "on_page.pages";
pub const ON_PAGE_PAGES_BY_RESOURCE: &str = "on_page.pages_by_resource";
pub const ON_PAGE_RESOURCES: &str = "on_page.resources";
pub const ON_PAGE_DUPLICATE_TAGS: &str = "on_page.duplicate_tags";
pub const ON_PAGE_DUPLICATE_CONTENT: &str = "on_page.duplicate_content";
pub const ON_PAGE_LINKS: &str = "on_page.links";
pub const ON_PAGE_NON_INDEXABLE: &str = "on_page.non_indexable";
pub const ON_PAGE_REDIRECT_CHAINS: &str = "on_page.redirect_chains";
pub const ON_PAGE_MICRODATA: &str = "on_page.microdata";
pub const ON_PAGE_KEYWORD_DENSITY: &str = "on_page.keyword_density";
pub const ON_PAGE_CONTENT_PARSING: &str = "on_page.content_parsing";
pub const ON_PAGE_LIGHTHOUSE_AUDITS: &str = "on_page.lighthouse.audits";

pub const LABS_HISTORICAL_RANK_OVERVIEW: &str = "labs.historical_rank_overview";
pub const LABS_SUBDOMAINS: &str = "labs.subdomains";
pub const LABS_RELEVANT_PAGES: &str = "labs.relevant_pages";
pub const LABS_PAGE_INTERSECTION: &str = "labs.page_intersection";
pub const LABS_KEYWORD_IDEAS: &str = "labs.keyword_ideas";
pub const LABS_TOP_SEARCHES: &str = "labs.top_searches";
pub const LABS_CATEGORIES_FOR_KEYWORDS: &str = "labs.categories_for_keywords";

pub const CONTENT_ANALYSIS_RATING_DISTRIBUTION: &str = "content_analysis.rating_distribution";
pub const CONTENT_ANALYSIS_PHRASE_TRENDS: &str = "content_analysis.phrase_trends";
pub const CONTENT_ANALYSIS_CATEGORY_TRENDS: &str = "content_analysis.category_trends";

pub const DOMAIN_ANALYTICS_DOMAINS_BY_TECH: &str = "domain_analytics.domains_by_technology";
pub const DOMAIN_ANALYTICS_AGGREGATION_TECH: &str = "domain_analytics.aggregation_technologies";

pub const APPENDIX_STATUS: &str = "appendix.status";
pub const APPENDIX_ERRORS: &str = "appendix.errors";

// ---------- Phase B: App Data ----------
pub const APP_DATA_GOOGLE_PLAY_SEARCHES: &str = "app_data.google.app_searches";
pub const APP_DATA_GOOGLE_PLAY_REVIEWS: &str = "app_data.google.app_reviews";
pub const APP_DATA_APPLE_SEARCHES: &str = "app_data.apple.app_searches";
pub const APP_DATA_APPLE_REVIEWS: &str = "app_data.apple.app_reviews";
