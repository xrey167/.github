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

export interface KeywordsSearchVolumeArgs {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  useCache: boolean;
}

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

export interface LabsSeedArgs {
  seed: string;
  locationCode: number;
  languageCode: string;
}

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
