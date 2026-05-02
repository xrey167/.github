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

  getRecentCalls: (args: { limit: number }) =>
    invoke<CallLogRow[]>("get_recent_calls", args),

  getUsageSummary: (args: { days: number }) =>
    invoke<UsageSummary>("get_usage_summary", args),
};

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
