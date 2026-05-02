import { useMemo, useState } from "react";

import type { CostAction } from "../../lib/cost";
import { tauriApi } from "../../lib/tauri";
import SeedTab from "./SeedTab";

const DEFAULT_LOCATION = 2276;
const DEFAULT_LANGUAGE = "de";

export default function RelatedTab() {
  const [depth, setDepth] = useState(2);

  const costAction = useMemo<CostAction>(
    () => ({ kind: "KeywordsRelated", depth, mode: "live" }),
    [depth],
  );

  return (
    <SeedTab
      title="Related Keywords"
      description="Ideas pulled from Googles 'searches related to' section. Higher depth costs more."
      exportFilenameStem="related-keywords"
      costAction={costAction}
      extraControls={
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-700">Depth: {depth}</span>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value, 10))}
          />
          <span className="text-xs text-slate-500">
            Each level expands related keywords of the previous level (cost scales linearly).
          </span>
        </label>
      }
      run={(seed) =>
        tauriApi.keywordsRelated({
          seed,
          locationCode: DEFAULT_LOCATION,
          languageCode: DEFAULT_LANGUAGE,
          depth,
        })
      }
    />
  );
}
