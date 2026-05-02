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
pub const DOMAIN_ANALYTICS_WHOIS_OVERVIEW: &str = "domain_analytics.whois.overview";
pub const DOMAIN_ANALYTICS_TECHNOLOGIES: &str = "domain_analytics.technologies.domain";
pub const SERP_GOOGLE_ADS_LIVE: &str = "serp.google.ads.live";
pub const SERP_GOOGLE_NEWS_LIVE: &str = "serp.google.news.live";
pub const SERP_GOOGLE_MAPS_LIVE: &str = "serp.google.maps.live";
pub const LABS_SERP_COMPETITORS: &str = "labs.serp_competitors";
pub const LABS_COMPETITORS_DOMAIN: &str = "labs.competitors_domain";
pub const LABS_DOMAIN_INTERSECTION: &str = "labs.domain_intersection";
