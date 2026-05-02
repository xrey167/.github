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

  keywordsSuggestions: (args: LabsSeedArgs & { limit: number }) =>
    invoke<LabsBatch>("keywords_suggestions", args),

  keywordsRelated: (args: LabsSeedArgs & { depth: number }) =>
    invoke<LabsBatch>("keywords_related", args),

  keywordsForDomain: (args: { target: string; locationCode: number; languageCode: string; limit: number }) =>
    invoke<LabsBatch>("keywords_for_domain", args),

  keywordsRanked: (args: { target: string; locationCode: number; languageCode: string; limit: number }) =>
    invoke<RankedBatch>("keywords_ranked", args),

  labsDomainRankOverview: (args: { target: string; locationCode: number; languageCode: string }) =>
    invoke<DomainRankOverviewView>("labs_domain_rank_overview", args),

  labsBulkKeywordDifficulty: (args: { keywords: string[]; locationCode: number; languageCode: string }) =>
    invoke<BulkDifficultyView>("labs_bulk_keyword_difficulty", args),

  serpLive: (args: { keyword: string; locationCode: number; languageCode: string; depth: number }) =>
    invoke<SerpLiveBatch>("serp_live", args),

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

  whoisOverview: (args: { domain: string }) =>
    invoke<WhoisView>("whois_overview", args),

  domainTechnologies: (args: { domain: string }) =>
    invoke<TechnologiesView>("domain_technologies", args),

  getRecentCalls: (args: { limit: number }) =>
    invoke<CallLogRow[]>("get_recent_calls", args),

  getUsageSummary: (args: { days: number }) =>
    invoke<UsageSummary>("get_usage_summary", args),

  getAiRecentCalls: (args: { limit: number }) =>
    invoke<AiCallRow[]>("get_ai_recent_calls", args),

  getAiUsageSummary: (args: { days: number }) =>
    invoke<AiUsageSummary>("get_ai_usage_summary", args),

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

export interface WhoisView {
  domain: string;
  // DataForSEO returns ~30 fields per row (registrar, dates, name servers,
  // status flags, contact info). The page picks the ones it knows.
  item: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
}

export interface TechnologiesView {
  domain: string;
  // Whole result blob — has `technologies` map keyed by category, plus
  // metadata fields (last_visited_date, country_iso_code, etc.).
  result: Record<string, unknown> | null;
  cost_usd: number;
  estimated_usd: number;
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
}

export interface DomainRankOverviewView {
  target: string;
  // Raw items from DataForSEO — items are objects with `metrics.organic`
  // and `metrics.paid` sub-objects. The page extracts the well-known
  // numeric fields (count, etv, pos_1, pos_2_3, etc.).
  items: Array<Record<string, unknown>>;
  cost_usd: number;
  estimated_usd: number;
}

export interface BulkDifficultyItem {
  keyword: string;
  keyword_difficulty: number | null;
}

export interface BulkDifficultyView {
  items: BulkDifficultyItem[];
  cost_usd: number;
  estimated_usd: number;
}
