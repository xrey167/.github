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
};
