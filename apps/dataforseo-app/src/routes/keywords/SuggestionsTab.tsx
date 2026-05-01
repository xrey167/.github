import { tauriApi } from "../../lib/tauri";
import SeedTab from "./SeedTab";

const DEFAULT_LOCATION = 2276;
const DEFAULT_LANGUAGE = "de";

export default function SuggestionsTab() {
  return (
    <SeedTab
      title="Keyword Suggestions"
      description="Long-tail keywords that contain the seed term, ranked by search volume."
      costAction={() => ({ kind: "KeywordsSuggestions", mode: "live" })}
      run={(seed) =>
        tauriApi.keywordsSuggestions({
          seed,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          limit: 200,
        })
      }
    />
  );
}
