//! Endpoint identifiers as constants. Used as the `endpoint` column value
//! in `api_calls` (the cost ledger). Centralizing them avoids the
//! string-typo class of bugs when the Usage page groups by endpoint.

pub const KEYWORDS_SEARCH_VOLUME: &str = "google_ads.search_volume";
pub const LABS_KEYWORD_SUGGESTIONS: &str = "labs.keyword_suggestions";
pub const LABS_RELATED_KEYWORDS: &str = "labs.related_keywords";
pub const LABS_KEYWORDS_FOR_SITE: &str = "labs.keywords_for_site";
pub const LABS_RANKED_KEYWORDS: &str = "labs.ranked_keywords";
pub const SERP_GOOGLE_ORGANIC_LIVE: &str = "serp.google.organic.live";
pub const SERP_GOOGLE_ORGANIC_TASK_POST: &str = "serp.google.organic.task_post";
pub const SERP_GOOGLE_ORGANIC_TASK_GET: &str = "serp.google.organic.task_get";
