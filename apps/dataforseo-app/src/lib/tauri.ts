import { invoke } from "@tauri-apps/api/core";

import type { CostAction } from "./cost";

export interface UserInfo {
  login: string;
  balance: number;
}

export const tauriApi = {
  saveCredentials: (login: string, password: string) =>
    invoke<void>("save_credentials", { login, password }),

  clearCredentials: () => invoke<void>("clear_credentials"),

  testConnection: () => invoke<UserInfo>("test_connection"),

  estimateCost: (action: CostAction) =>
    invoke<number>("estimate_cost", { action }),
};
