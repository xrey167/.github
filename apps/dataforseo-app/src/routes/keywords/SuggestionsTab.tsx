import { useTranslation } from "react-i18next";

import type { CostAction } from "../../lib/cost";
import { tauriApi } from "../../lib/tauri";
import SeedTab from "./SeedTab";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";

const SUGGESTIONS_COST: CostAction = { kind: "KeywordsSuggestions", mode: "live" };

export default function SuggestionsTab() {
  const { t } = useTranslation();
  return (
    <SeedTab
      title={t("keywords.suggestions.title")}
      description={t("keywords.suggestions.description")}
      exportFilenameStem={t("keywords.suggestions.filenameStem")}
      costAction={SUGGESTIONS_COST}
      run={(seed, useCache) =>
        tauriApi.keywordsSuggestions({
          seed,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          limit: 200,
          useCache,
        })
      }
    />
  );
}
