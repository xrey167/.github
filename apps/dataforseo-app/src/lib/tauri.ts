import { invoke } from "@tauri-apps/api/core";

import type { CostAction } from "./cost";

export interface UserInfo {
  login: string;
  balance: number;
}

export interface KeywordVolume {
  keyword: string;
  search_volume: number | null;
  competition: string | null;
  competition_index: number | null;
  cpc: number | null;
  low_top_of_page_bid: number | null;
  high_top_of_page_bid: number | null;
  monthly_searches: unknown;
  from_cache: boolean;
}

export interface KeywordVolumeBatch {
  items: KeywordVolume[];
  cache_hits: number;
  fresh: number;
  cost_usd: number;
  estimated_usd: number;
}

// `type` alias rather than `interface`: Tauri's invoke() requires the
// args to satisfy `Record<string, unknown>`. A named interface doesn't,
// because interfaces are extensible (any future declaration could add
// non-string-key members), but a closed type alias does. Avoids the
// `[k: string]: unknown` index-signature workaround which would weaken
// property-access checking.
export type KeywordsSearchVolumeArgs = {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  useCache: boolean;
};

export interface LabsKeyword {
  keyword: string;
  search_volume: number | null;
  competition: string | null;
  competition_index: number | null;
  cpc: number | null;
  keyword_difficulty: number | null;
}

export interface LabsBatch {
  items: LabsKeyword[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

// See KeywordsSearchVolumeArgs above for why this is a `type` alias.
export type LabsSeedArgs = {
  seed: string;
  locationCode: number;
  languageCode: string;
};

export const tauriApi = {
  saveCredentials: (login: string, password: string) =>
    invoke<void>("save_credentials", { login, password }),

  clearCredentials: () => invoke<void>("clear_credentials"),

  testConnection: () => invoke<UserInfo>("test_connection"),

  estimateCost: (action: CostAction) =>
    invoke<number>("estimate_cost", { action }),

  keywordsSearchVolume: (args: KeywordsSearchVolumeArgs) =>
    invoke<KeywordVolumeBatch>("keywords_search_volume", args),

  keywordsSuggestions: (args: LabsSeedArgs & { limit: number; useCache: boolean }) =>
    invoke<LabsBatch>("keywords_suggestions", args),

  keywordsRelated: (args: LabsSeedArgs & { depth: number; useCache: boolean }) =>
    invoke<LabsBatch>("keywords_related", args),

  keywordsForDomain: (args: { target: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<LabsBatch>("keywords_for_domain", args),

  keywordsRanked: (args: { target: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<RankedBatch>("keywords_ranked", args),

  labsDomainRankOverview: (args: { target: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<DomainRankOverviewView>("labs_domain_rank_overview", args),

  labsBulkKeywordDifficulty: (args: { keywords: string[]; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<BulkDifficultyView>("labs_bulk_keyword_difficulty", args),

  labsSerpCompetitors: (args: { keyword: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<SerpCompetitorsView>("labs_serp_competitors", args),

  labsCompetitorsDomain: (args: { target: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<CompetitorsDomainView>("labs_competitors_domain", args),

  labsDomainIntersection: (args: { target1: string; target2: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<DomainIntersectionView>("labs_domain_intersection", args),

  labsBulkSearchVolume: (args: { keywords: string[]; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<BulkVolumeView>("labs_bulk_search_volume", args),

  keywordGap: (args: { yours: string; competitor: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<KeywordGapView>("keyword_gap", args),

  trackingAdd: (args: { target: string; keyword: string; locationCode: number; languageCode: string; frequency: "daily" | "weekly" | "manual" }) =>
    invoke<number>("tracking_add", args),

  trackingList: () => invoke<TrackedKeywordWithRank[]>("tracking_list"),

  trackingRemove: (args: { id: number }) => invoke<void>("tracking_remove", args),

  trackingHistory: (args: { id: number; days: number }) =>
    invoke<RankPoint[]>("tracking_history", args),

  trackingRunNow: (args: { id: number }) => invoke<void>("tracking_run_now", args),

  auditStart: (args: { target: string; maxCrawlPages: number }) =>
    invoke<number>("audit_start", args),

  auditList: (args: { limit: number }) => invoke<AuditRun[]>("audit_list", args),

  auditGet: (args: { id: number }) => invoke<AuditRun | null>("audit_get", args),

  auditPages: (args: { id: number; limit: number; offset: number }) =>
    invoke<AuditPage[]>("audit_pages", args),

  auditDelete: (args: { id: number }) => invoke<void>("audit_delete", args),

  serpLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<SerpLiveBatch>("serp_live", args),

  serpAdsLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<SerpLiveBatch>("serp_ads_live", args),

  serpNewsLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<SerpLiveBatch>("serp_news_live", args),

  serpMapsLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<MapsLiveBatch>("serp_maps_live", args),

  serpTaskCreate: (args: {
    keywords: string[];
    locationCode: number;
    languageCode: string;
    depth: number;
  }) => invoke<TaskBatchId>("serp_task_create", args),

  serpTaskStatus: (args: { batchId: string }) =>
    invoke<TaskBatchStatus>("serp_task_status", args),

  serpTaskRecentBatches: (args: { limit: number }) =>
    invoke<BatchSummary[]>("serp_task_recent_batches", args),

  backlinksSummary: (args: { target: string; useCache: boolean }) =>
    invoke<BacklinksSummaryView>("backlinks_summary", args),

  backlinksDetail: (params: BacklinksDetailParams) =>
    invoke<BacklinksDetailView>("backlinks_detail", { params }),

  backlinksReferringDomains: (params: BacklinksListParams) =>
    invoke<BacklinksListView>("backlinks_referring_domains", { params }),

  backlinksAnchors: (params: BacklinksListParams) =>
    invoke<BacklinksListView>("backlinks_anchors", { params }),

  backlinksHistory: (params: BacklinksHistoryParams) =>
    invoke<BacklinksListView>("backlinks_history", { params }),

  backlinksDomainIntersection: (params: BacklinksIntersectionParams) =>
    invoke<BacklinksListView>("backlinks_domain_intersection", { params }),

  backlinksDomainPages: (params: BacklinksListParams) =>
    invoke<BacklinksListView>("backlinks_domain_pages", { params }),

  backlinksPageIntersection: (params: BacklinksPageIntersectionParams) =>
    invoke<BacklinksListView>("backlinks_page_intersection", { params }),

  labsKeywordOverview: (args: { keyword: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<KeywordOverviewView>("labs_keyword_overview", args),

  labsSearchIntent: (args: { keywords: string[]; languageCode: string; useCache: boolean }) =>
    invoke<SearchIntentView>("labs_search_intent", args),

  topicResearch: (args: { seed: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<TopicBriefView>("topic_research", args),

  serpAutocomplete: (args: { keyword: string; locationCode: number; languageCode: string }) =>
    invoke<AutocompleteView>("serp_autocomplete", args),

  serpAiOverview: (args: { keyword: string; locationCode: number; languageCode: string }) =>
    invoke<AiOverviewView>("serp_ai_overview", args),

  googleTrendsExplore: (args: {
    keywords: string[];
    locationCode: number;
    languageCode: string;
    dateFrom: string | null;
    dateTo: string | null;
    useCache: boolean;
  }) => invoke<TrendsView>("google_trends_explore", args),

  labsCategoriesForDomain: (args: { target: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<CategoriesForDomainView>("labs_categories_for_domain", args),

  serpAiModeLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<SerpLiveBatch>("serp_ai_mode_live", args),

  serpBingOrganicLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<SerpLiveBatch>("serp_bing_organic_live", args),

  googleAdsKeywordsForSite: (args: { target: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<KeywordVolumeBatch>("google_ads_keywords_for_site", args),

  googleAdsKeywordsForKeywords: (args: { seeds: string[]; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<KeywordVolumeBatch>("google_ads_keywords_for_keywords", args),

  brandSearch: (args: { keyword: string; limit: number; positiveKeywords: string[]; negativeKeywords: string[]; useCache: boolean }) =>
    invoke<BrandSearchView>("brand_search", args),

  brandSummary: (args: { keyword: string; positiveKeywords: string[]; negativeKeywords: string[]; useCache: boolean }) =>
    invoke<BrandSummaryView>("brand_summary", args),

  brandSentiment: (args: { keyword: string; limit: number; useCache: boolean }) =>
    invoke<BrandSentimentView>("brand_sentiment", args),

  backlinksBulkBacklinks: (args: { params: BulkBacklinksParams; useCache: boolean }) =>
    invoke<BulkRowsView>("backlinks_bulk_backlinks", args),
  backlinksBulkReferringDomains: (args: { params: BulkBacklinksParams; useCache: boolean }) =>
    invoke<BulkRowsView>("backlinks_bulk_referring_domains", args),
  backlinksBulkRanks: (args: { params: BulkBacklinksParams; useCache: boolean }) =>
    invoke<BulkRowsView>("backlinks_bulk_ranks", args),
  backlinksBulkSpamScore: (args: { params: BulkBacklinksParams; useCache: boolean }) =>
    invoke<BulkRowsView>("backlinks_bulk_spam_score", args),
  backlinksBulkNewLost: (args: { params: BulkBacklinksParams; useCache: boolean }) =>
    invoke<BulkRowsView>("backlinks_bulk_new_lost", args),
  backlinksReferringNetworks: (params: BacklinksListParams) =>
    invoke<BacklinksListView>("backlinks_referring_networks", { params }),
  backlinksDomainPagesSummary: (args: { target: string; includeSubdomains: boolean; useCache: boolean }) =>
    invoke<DomainPagesSummaryView>("backlinks_domain_pages_summary", args),
  backlinksAvailableFilters: (args: { useCache: boolean }) =>
    invoke<AvailableFiltersView>("backlinks_available_filters", args),

  labsHistoricalRankOverview: (args: { target: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<LabsRawView>("labs_historical_rank_overview", args),
  labsSubdomains: (args: { target: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<LabsRawView>("labs_subdomains", args),
  labsRelevantPages: (args: { target: string; locationCode: number; languageCode: string; useCache: boolean }) =>
    invoke<LabsRawView>("labs_relevant_pages", args),
  labsPageIntersection: (args: { pages: string[]; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<LabsRawView>("labs_page_intersection", args),
  labsKeywordIdeas: (args: { keywords: string[]; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<LabsRawView>("labs_keyword_ideas", args),
  labsTopSearches: (args: { locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<LabsRawView>("labs_top_searches", args),
  labsCategoriesForKeywords: (args: { keywords: string[]; languageCode: string; useCache: boolean }) =>
    invoke<LabsRawView>("labs_categories_for_keywords", args),

  onPagePages: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_pages_get", args),
  onPagePagesByResource: (args: { taskId: string; url: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_pages_by_resource_get", args),
  onPageResources: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_resources_get", args),
  onPageDuplicateTags: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_duplicate_tags_get", args),
  onPageDuplicateContent: (args: { taskId: string; url: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_duplicate_content_get", args),
  onPageLinks: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_links_get", args),
  onPageNonIndexable: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_non_indexable_get", args),
  onPageRedirectChains: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_redirect_chains_get", args),
  onPageMicrodata: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_microdata_get", args),
  onPageKeywordDensity: (args: { taskId: string; limit: number; offset: number; useCache: boolean }) =>
    invoke<OnPageItemsView>("on_page_keyword_density_get", args),
  onPageContentParsing: (args: { url: string }) =>
    invoke<unknown>("on_page_content_parsing_command", args),
  onPageLighthouseAudits: () =>
    invoke<unknown>("on_page_lighthouse_audits_get"),

  domainAnalyticsDomainsByTechnology: (args: { technologies: string[]; limit: number; useCache: boolean }) =>
    invoke<unknown>("domain_analytics_domains_by_technology", args),
  domainAnalyticsAggregationTechnologies: (args: { targets: string[]; useCache: boolean }) =>
    invoke<unknown>("domain_analytics_aggregation_technologies", args),

  brandRatingDistribution: (args: { keyword: string; useCache: boolean }) =>
    invoke<unknown>("brand_rating_distribution", args),
  brandPhraseTrends: (args: { keyword: string; dateFrom: string | null; dateTo: string | null; useCache: boolean }) =>
    invoke<unknown>("brand_phrase_trends", args),
  brandCategoryTrends: (args: { categoryCode: number; useCache: boolean }) =>
    invoke<unknown>("brand_category_trends", args),

  appendixStatus: () => invoke<unknown>("appendix_status"),
  appendixErrors: () => invoke<unknown>("appendix_errors"),

  appDataGooglePlayAppSearches: (args: { keyword: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<AppDataView>("app_data_google_play_app_searches", args),
  appDataAppleAppSearches: (args: { keyword: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<AppDataView>("app_data_apple_app_searches", args),
  appDataGooglePlayAppReviews: (args: { appId: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<AppDataView>("app_data_google_play_app_reviews", args),
  appDataAppleAppReviews: (args: { appId: string; locationCode: number; languageCode: string; limit: number; useCache: boolean }) =>
    invoke<AppDataView>("app_data_apple_app_reviews", args),

  projectsList: () => invoke<Project[]>("projects_list"),
  projectsCreate: (args: { name: string; target: string }) =>
    invoke<number>("projects_create", args),
  projectsRename: (args: { id: number; name: string }) =>
    invoke<void>("projects_rename", args),
  projectsDelete: (args: { id: number }) => invoke<void>("projects_delete", args),

  reportsListSchedules: () => invoke<ReportSchedule[]>("reports_list_schedules"),
  reportsCreateSchedule: (args: { projectId: number | null; kind: string; cadence: string }) =>
    invoke<number>("reports_create_schedule", args),
  reportsToggleSchedule: (args: { id: number; active: boolean }) =>
    invoke<void>("reports_toggle_schedule", args),
  reportsDeleteSchedule: (args: { id: number }) =>
    invoke<void>("reports_delete_schedule", args),
  reportsListRuns: (args: { scheduleId: number }) =>
    invoke<ReportRun[]>("reports_list_runs", args),

  whoisOverview: (args: { domain: string; useCache: boolean }) =>
    invoke<WhoisView>("whois_overview", args),

  domainTechnologies: (args: { domain: string; useCache: boolean }) =>
    invoke<TechnologiesView>("domain_technologies", args),

  onPageInstant: (args: { url: string; enableJavascript: boolean; enableBrowserRendering: boolean; useCache: boolean }) =>
    invoke<OnPageInstantView>("on_page_instant", args),

  onPageLighthouse: (args: { url: string; forMobile: boolean; useCache: boolean }) =>
    invoke<LighthouseView>("on_page_lighthouse", args),

  getRecentCalls: (args: { limit: number }) =>
    invoke<CallLogRow[]>("get_recent_calls", args),

  getUsageSummary: (args: { days: number }) =>
    invoke<UsageSummary>("get_usage_summary", args),

  getAiRecentCalls: (args: { limit: number }) =>
    invoke<AiCallRow[]>("get_ai_recent_calls", args),

  getAiUsageSummary: (args: { days: number }) =>
    invoke<AiUsageSummary>("get_ai_usage_summary", args),

  getBudgetStatus: (args: { period: "daily" | "monthly" }) =>
    invoke<BudgetStatus>("get_budget_status", args),

  setBudget: (args: { budget: { period: "daily" | "monthly"; limit_usd: number; alert_at_pct: number } }) =>
    invoke<void>("set_budget", args),

  clearBudget: (args: { period: "daily" | "monthly" }) =>
    invoke<void>("clear_budget", args),

  aiProviderStatus: () => invoke<AiProviderStatus[]>("ai_provider_status"),

  aiSaveProviderKey: (args: { provider: string; apiKey: string }) =>
    invoke<void>("ai_save_provider_key", args),

  aiClearProviderKey: (args: { provider: string }) =>
    invoke<void>("ai_clear_provider_key", args),

  aiSetActiveProvider: (args: { provider: string }) =>
    invoke<void>("ai_set_active_provider", args),

  aiPromptTemplates: () => invoke<PromptTemplate[]>("ai_prompt_templates"),

  chatNewSession: (args: {
    attachmentSummary: string | null;
    attachmentJson: unknown | null;
  }) => invoke<number>("chat_new_session", { args }),

  chatListSessions: (args: { limit: number }) =>
    invoke<ChatSession[]>("chat_list_sessions", args),

  chatHistory: (args: { sessionId: number }) =>
    invoke<StoredChatMessage[]>("chat_history", args),

  chatSend: (args: {
    sessionId: number;
    userContent: string;
    promptTemplateId: string | null;
  }) => invoke<StoredChatMessage>("chat_send", { args }),

  semrushImport: (args: {
    csvContent: string;
    filename: string;
    locationCode: number;
    languageCode: string;
    target?: string;
  }) => invoke<SemrushImportResult>("semrush_import", args),

  semrushListImports: () => invoke<SemrushImport[]>("semrush_list_imports"),

  plannedPostsList: (args: { projectId: number | null }) =>
    invoke<PlannedPost[]>("planned_posts_list", args),

  plannedPostsCreate: (args: { input: PlannedPostInput }) =>
    invoke<number>("planned_posts_create", args),

  plannedPostsUpdate: (args: { id: number; input: PlannedPostInput }) =>
    invoke<void>("planned_posts_update", args),

  plannedPostsDelete: (args: { id: number }) =>
    invoke<void>("planned_posts_delete", args),

  topicClustersList: (args: { projectId: number | null }) =>
    invoke<TopicCluster[]>("topic_clusters_list", args),

  topicClustersCreate: (args: { input: TopicClusterInput }) =>
    invoke<number>("topic_clusters_create", args),

  topicClustersUpdate: (args: { id: number; input: TopicClusterInput }) =>
    invoke<void>("topic_clusters_update", args),

  topicClustersDelete: (args: { id: number }) =>
    invoke<void>("topic_clusters_delete", args),
};

export interface AiProviderStatus {
  provider: string;
  configured: boolean;
  model: string | null;
}

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  system: string;
}

export interface ChatSession {
  id: number;
  title: string | null;
  provider: string;
  model: string;
  attachment_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StoredChatMessage {
  id: number;
  session_id: number;
  role: string;
  content: string;
  prompt_template_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  created_at: string | null;
}

export interface BudgetStatus {
  period: string;
  limit_usd: number | null;
  alert_at_pct: number | null;
  spent_usd: number;
  used_pct: number | null;
  // "ok" | "alert" | "exceeded" | "no_budget"
  state: string;
}

export interface CallLogRow {
  ts: string;
  endpoint: string;
  mode: string;
  cost_usd: number;
  estimated_usd: number | null;
  request_size: number | null;
  duration_ms: number | null;
  error: string | null;
}

export interface UsageByEndpoint {
  endpoint: string;
  call_count: number;
  cost_usd: number;
}

export interface UsageSummary {
  days: number;
  total_calls: number;
  total_cost_usd: number;
  total_estimated_usd: number;
  by_endpoint: UsageByEndpoint[];
}

export interface AiCallRow {
  ts: string;
  provider: string;
  model: string;
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number | null;
  error: string | null;
}

export interface AiUsageByModel {
  provider: string;
  model: string;
  call_count: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface AiUsageSummary {
  days: number;
  total_calls: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_model: AiUsageByModel[];
}

export interface BacklinksSummaryView {
  target: string;
  // Raw response shape from DataForSEO — variable enough that we let the
  // page extract the fields it cares about with `summary?.field`.
  summary: Record<string, unknown>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export type BacklinksDetailMode = "as_is" | "one_per_domain" | "one_per_anchor";
export type BacklinksDetailStatus = "all" | "live" | "lost";

// Mirrors the recursive Filter enum in domain::filters. Mostly built by the
// preset dropdown for now; the full visual builder is a future milestone.
export type FilterTree =
  | {
      kind: "condition";
      field: string;
      operator: FilterOperator;
      value: unknown;
    }
  | { kind: "group"; nodes: FilterTree[]; connectors: FilterLogical[] };

export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "lt"
  | "ge"
  | "le"
  | "in"
  | "not_in"
  | "like"
  | "not_like"
  | "ilike"
  | "not_ilike"
  | "match"
  | "not_match";

export type FilterLogical = "and" | "or";

export interface BacklinksDetailParams {
  target: string;
  mode: BacklinksDetailMode;
  status: BacklinksDetailStatus;
  limit: number;
  offset: number;
  includeSubdomains: boolean;
  filter: FilterTree | null;
  orderBy: string[] | null;
}

export interface BacklinksDetailView {
  target: string;
  total_count: number;
  items_count: number;
  // DataForSEO returns ~25 fields per row — we keep them as `unknown` and
  // let the table component pick the columns it can render.
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
}

// Shared shape for /referring_domains/live and /anchors/live commands.
export interface BacklinksListParams {
  target: string;
  limit: number;
  offset: number;
  includeSubdomains: boolean;
  filter: FilterTree | null;
  orderBy: string[] | null;
}

export interface BacklinksListView {
  target: string;
  total_count: number;
  items_count: number;
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
}

export interface BacklinksHistoryParams {
  target: string;
  // YYYY-MM-DD; both ends optional.
  dateFrom: string | null;
  dateTo: string | null;
}

export type BacklinksIntersectionMode = "intersect" | "exclude";

export interface BacklinksIntersectionParams {
  targetA: string;
  targetB: string;
  intersectionMode: BacklinksIntersectionMode;
  limit: number;
  offset: number;
  includeSubdomains: boolean;
  filter: FilterTree | null;
  orderBy: string[] | null;
}

export interface BacklinksPageIntersectionParams {
  pages: string[];
  intersections: number;
  limit: number;
  offset: number;
  includeSubdomains: boolean;
  filter: FilterTree | null;
  orderBy: string[] | null;
}

export interface KeywordOverviewView {
  keyword: string;
  // Raw item from /keyword_overview — UI extracts known fields
  // (keyword_info.search_volume, keyword_properties.keyword_difficulty,
  // serp_info, search_intent_info).
  item: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface SearchIntentView {
  // Items array — each item carries keyword + keyword_intent.label
  // (informational/commercial/navigational/transactional).
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface BriefRelatedKeyword {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
}

export interface BriefTopResult {
  rank: number;
  url: string;
  domain: string | null;
  title: string | null;
  word_count: number | null;
  headings: string[];
}

export interface TopicBriefView {
  seed: string;
  recommended_word_count: number | null;
  min_word_count: number | null;
  max_word_count: number | null;
  common_headings: string[];
  related_keywords: BriefRelatedKeyword[];
  top_results: BriefTopResult[];
  total_volume_potential: number;
  avg_difficulty: number;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface AutocompleteSuggestion {
  suggestion: string | null;
  relevance: number | null;
  rank_absolute: number | null;
}

export interface AutocompleteView {
  keyword: string;
  items: AutocompleteSuggestion[];
  cost_usd: number;
  estimated_usd: number;
}

export interface AiOverviewView {
  keyword: string;
  // Raw item — UI extracts text + reference list. Null when no AI
  // Overview exists for the keyword.
  item: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
}

export interface TrendsView {
  keywords: string[];
  // Raw items — UI charts the google_trends_graph item; topics_list /
  // queries_list are rendered as side-by-side lists if present.
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface CategoriesForDomainView {
  target: string;
  // IAB-style taxonomy — items have category_code/category_name and
  // sometimes a coverage percentage.
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface BrandSearchView {
  keyword: string;
  // Each item carries url, title, snippet, source domain, sentiment
  // (positive/neutral/negative) and rank-style metadata.
  items: Array<Record<string, unknown>>;
  items_count: number;
  total_count: number;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface BrandSummaryView {
  keyword: string;
  // Aggregate counts: total_count, sentiments_count.{positive,neutral,
  // negative}, top_keywords/categories arrays.
  result: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface BrandSentimentView {
  keyword: string;
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface BulkBacklinksParams {
  targets: string[];
  includeSubdomains: boolean;
}

export interface BulkRowsView {
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface DomainPagesSummaryView {
  target: string;
  result: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface AvailableFiltersView {
  // DataForSEO returns a nested map of fields → operators per endpoint.
  result: Record<string, unknown> | null;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface LabsRawView {
  // Raw Labs items array — UI extracts known fields per endpoint
  // (historical_rank_overview, subdomains, relevant_pages, etc.).
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface OnPageItemsView {
  // On-Page sub-endpoint items (pages, resources, links, etc.).
  items: Array<Record<string, unknown>>;
  items_count: number;
  total_count: number;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface AppDataView {
  // Google Play / App Store search or review items. Per-store fields
  // surface differently — UI extracts known ones (title, rating, etc.).
  items: Array<Record<string, unknown>>;
  items_count: number;
  total_count: number;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface Project {
  id: number;
  name: string;
  target: string;
  created_at: string | null;
}

export interface ReportSchedule {
  id: number;
  project_id: number | null;
  kind: string;
  cadence: string;
  active: boolean;
  last_run_at: string | null;
  created_at: string | null;
}

export interface ReportRun {
  id: number;
  schedule_id: number;
  pdf_path: string;
  generated_at: string | null;
}

export interface WhoisView {
  domain: string;
  // DataForSEO returns ~30 fields per row (registrar, dates, name servers,
  // status flags, contact info). The page picks the ones it knows.
  item: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface TechnologiesView {
  domain: string;
  // Whole result blob — has `technologies` map keyed by category, plus
  // metadata fields (last_visited_date, country_iso_code, etc.).
  result: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface TaskBatchId {
  batch_id: string;
  task_count: number;
  cost_usd: number;
  estimated_usd: number;
}

export interface SerpTask {
  task_id: string;
  batch_id: string;
  keyword: string;
  location_code: number;
  language_code: string;
  depth: number;
  status: string;
  posted_at: string | null;
  fetched_at: string | null;
  poll_attempts: number;
  cost_usd: number | null;
  error: string | null;
}

export interface StoredSerpItem {
  task_id: string;
  position: number;
  kind: string;
  url: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
}

export interface TaskBatchStatus {
  batch_id: string;
  tasks: SerpTask[];
  results: Record<string, StoredSerpItem[]>;
}

export interface BatchSummary {
  batch_id: string;
  total: number;
  pending: number;
  ready: number;
  fetched: number;
  failed: number;
  posted_at: string | null;
}

export interface SerpResultItem {
  kind: string;
  rank_absolute: number | null;
  url: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
}

export interface SerpLiveBatch {
  keyword: string;
  items: SerpResultItem[];
  cost_usd: number;
  estimated_usd: number;
}

export interface RankedKeyword {
  keyword: string;
  search_volume: number | null;
  competition: string | null;
  cpc: number | null;
  keyword_difficulty: number | null;
  rank_absolute: number | null;
  serp_url: string | null;
  etv: number | null;
}

export interface RankedBatch {
  items: RankedKeyword[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface DomainRankOverviewView {
  target: string;
  // Raw items from DataForSEO — items are objects with `metrics.organic`
  // and `metrics.paid` sub-objects. The page extracts the well-known
  // numeric fields (count, etv, pos_1, pos_2_3, etc.).
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface BulkDifficultyItem {
  keyword: string;
  keyword_difficulty: number | null;
}

export interface BulkDifficultyView {
  items: BulkDifficultyItem[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface SerpCompetitor {
  domain: string | null;
  avg_position: number | null;
  median_position: number | null;
  rating: number | null;
  etv: number | null;
  count: number | null;
}

export interface SerpCompetitorsView {
  keyword: string;
  items: SerpCompetitor[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface CompetitorDomain {
  domain: string | null;
  avg_position: number | null;
  sum_position: number | null;
  intersections: number | null;
}

export interface CompetitorsDomainView {
  target: string;
  items: CompetitorDomain[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface IntersectionKeyword {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  rank_first: number | null;
  rank_second: number | null;
  url_first: string | null;
  url_second: string | null;
}

export interface DomainIntersectionView {
  target1: string;
  target2: string;
  items: IntersectionKeyword[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface TrackedKeyword {
  id: number;
  target: string;
  keyword: string;
  location_code: number;
  language_code: string;
  // "daily" | "weekly" | "manual"
  frequency: string;
  active: boolean;
  created_at: string | null;
  last_run_at: string | null;
}

export interface TrackedKeywordWithRank {
  keyword: TrackedKeyword;
  current_rank: number | null;
  previous_rank: number | null;
  current_url: string | null;
}

export interface RankPoint {
  fetched_at: string;
  rank_absolute: number | null;
  url: string | null;
}

export interface AuditRun {
  id: number;
  target: string;
  task_id: string | null;
  max_crawl_pages: number;
  // 'pending' | 'running' | 'ready' | 'failed'
  status: string;
  started_at: string | null;
  completed_at: string | null;
  last_polled_at: string | null;
  cost_usd: number | null;
  // Raw summary blob from /v3/on_page/summary; UI extracts known fields.
  summary: Record<string, unknown> | null;
  error: string | null;
  page_count: number;
}

export interface AuditPage {
  id: number;
  url: string;
  status_code: number | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  plain_text_word_count: number | null;
  page_timing_ttfb: number | null;
  onpage_score: number | null;
  raw: Record<string, unknown> | null;
}

export interface BulkVolumeItem {
  keyword: string;
  search_volume: number | null;
  competition: number | null;
  competition_level: string | null;
  cpc: number | null;
}

export interface BulkVolumeView {
  items: BulkVolumeItem[];
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface GapKeyword {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  rank_yours: number | null;
  rank_theirs: number | null;
  // "missing" | "weak" | "strong" | "unique"
  bucket: string;
}

export interface KeywordGapView {
  yours: string;
  competitor: string;
  items: GapKeyword[];
  missing_count: number;
  weak_count: number;
  strong_count: number;
  unique_count: number;
  cost_usd: number;
  estimated_usd: number;
}

export interface OnPageInstantView {
  url: string;
  // Items array; first row holds the page audit (meta, content, checks).
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface LighthouseView {
  url: string;
  // Full Lighthouse result blob — categories.{performance, accessibility,
  // best-practices, seo, pwa}.score (0..1), plus audits map.
  result: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
  from_cache: boolean;
  fetched_at: string | null;
}

export interface MapsResultItem {
  kind: string;
  rank_absolute: number | null;
  title: string | null;
  url: string | null;
  domain: string | null;
  address: string | null;
  phone: string | null;
  rating: number | null;
  rating_count: number | null;
  place_id: string | null;
  category: string | null;
}

export interface MapsLiveBatch {
  keyword: string;
  items: MapsResultItem[];
  cost_usd: number;
  estimated_usd: number;
}

export interface SemrushImportResult {
  import_type: string;
  rows_imported: number;
  keywords_cached: number;
  positions_recorded: number;
  cost_saved_usd: number;
  warnings: string[];
}

export interface SemrushImport {
  id: number;
  filename: string;
  import_type: string;
  rows_imported: number;
  location_code: number | null;
  language_code: string | null;
  cost_saved_usd: number;
  imported_at: string | null;
}

export interface PlannedPost {
  id: number;
  project_id: number | null;
  cluster_id: number | null;
  title: string;
  target_keyword: string | null;
  /** "idea" | "drafting" | "review" | "published" | "archived" */
  status: string;
  /** ISO YYYY-MM-DD */
  scheduled_for: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlannedPostInput {
  project_id: number | null;
  cluster_id: number | null;
  title: string;
  target_keyword: string | null;
  status: string | null;
  scheduled_for: string | null;
  notes: string | null;
}

export interface TopicCluster {
  id: number;
  project_id: number | null;
  name: string;
  pillar_keyword: string | null;
  description: string | null;
  color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TopicClusterInput {
  project_id: number | null;
  name: string;
  pillar_keyword: string | null;
  description: string | null;
  color: string | null;
}
