import { tauriApi } from "../../lib/tauri";
import SerpKeywordTab from "./SerpKeywordTab";

export default function NewsTab() {
  return (
    <SerpKeywordTab
      hint="Google News results for a keyword — article titles, source domains, and snippet text. Same 0.002 USD/row cost as organic."
      apiCall={(args) => tauriApi.serpNewsLive(args)}
    />
  );
}
