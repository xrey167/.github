import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CostAction } from "../../lib/cost";
import { tauriApi } from "../../lib/tauri";
import SeedTab from "./SeedTab";
import { DEFAULT_LANGUAGE, DEFAULT_LOCATION } from "../../lib/constants";

export default function RelatedTab() {
  const { t } = useTranslation();
  const [depth, setDepth] = useState(2);

  const costAction = useMemo<CostAction>(
    () => ({ kind: "KeywordsRelated", depth, mode: "live" }),
    [depth],
  );

  return (
    <SeedTab
      title={t("keywords.related.title")}
      description={t("keywords.related.description")}
      exportFilenameStem={t("keywords.related.filenameStem")}
      costAction={costAction}
      extraControls={
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-700">{t("keywords.related.depthLabel", { depth })}</span>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value, 10))}
          />
          <span className="text-xs text-slate-500">{t("keywords.related.depthHint")}</span>
        </label>
      }
      run={(seed, useCache) =>
        tauriApi.keywordsRelated({
          seed,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          depth,
          useCache,
        })
      }
    />
  );
}
