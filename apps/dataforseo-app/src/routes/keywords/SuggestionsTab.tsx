import type { CostAction } from "../../lib/cost";
import { tauriApi } from "../../lib/tauri";
import SeedTab from "./SeedTab";

const DEFAULT_LOCATION = 2276;
const DEFAULT_LANGUAGE = "de";

const SUGGESTIONS_COST: CostAction = { kind: "KeywordsSuggestions", mode: "live" };

export default function SuggestionsTab() {
  return (
    <SeedTab
      title="Keyword Suggestions"
      description="Long-tail keywords that contain the seed term, ranked by search volume."
      costAction={SUGGESTIONS_COST}
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
