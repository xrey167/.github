import { tauriApi } from "../../lib/tauri";
import SerpKeywordTab from "./SerpKeywordTab";

export default function BingOrganicTab() {
  return (
    <SerpKeywordTab
      hint="Bing organic SERP — useful when Bing/Edge market share matters for the niche. Same 0.002 USD/row cost as Google organic."
      apiCall={(args) => tauriApi.serpBingOrganicLive(args)}
    />
  );
}
