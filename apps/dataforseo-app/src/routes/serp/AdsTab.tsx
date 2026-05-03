import { tauriApi } from "../../lib/tauri";
import SerpKeywordTab from "./SerpKeywordTab";

export default function AdsTab() {
  return (
    <SerpKeywordTab
      hint="Paid ad results for a keyword — headlines, display URLs, and ad descriptions. Same 0.002 USD/row cost as organic."
      apiCall={(args) => tauriApi.serpAdsLive(args)}
    />
  );
}
