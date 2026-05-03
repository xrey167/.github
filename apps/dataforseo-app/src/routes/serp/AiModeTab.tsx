import { tauriApi } from "../../lib/tauri";
import SerpKeywordTab from "./SerpKeywordTab";

export default function AiModeTab() {
  return (
    <SerpKeywordTab
      hint="Google's experimental AI Mode SERP — synthesized AI answer with cited source URLs. Same 0.002 USD/row cost as organic."
      apiCall={(args) => tauriApi.serpAiModeLive(args)}
    />
  );
}
