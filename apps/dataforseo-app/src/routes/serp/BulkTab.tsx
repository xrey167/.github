import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import BulkKeywordInput, { parseKeywords } from "../../components/BulkKeywordInput";
import CostPreview from "../../components/CostPreview";
import { formatUsd } from "../../lib/format";
import { tauriApi } from "../../lib/tauri";

const DEFAULT_LOCATION = 2276;
const DEFAULT_LANGUAGE = "de";
const MAX_KEYWORDS = 100;

export default function BulkTab() {
  const [raw, setRaw] = useState("");
  const [depth, setDepth] = useState(10);
  const [busy, setBusy] = useState(false);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  const keywords = useMemo(() => parseKeywords(raw), [raw]);

  const costAction = useMemo(
    () =>
      ({
        kind: "Serp",
        count: keywords.length,
        mode: "standard",
        depth,
        extra_params: 0,
      }) as const,
    [keywords.length, depth],
  );

  async function onRun() {
    if (keywords.length === 0 || keywords.length > MAX_KEYWORDS) return;
    setBusy(true);
    try {
      const result = await tauriApi.serpTaskCreate({
        keywords,
        locationCode: DEFAULT_LOCATION,
        languageCode: DEFAULT_LANGUAGE,
        depth,
      });
      setLastBatchId(result.batch_id);
      toast.success(
        `Submitted ${result.task_count} tasks (${formatUsd(result.cost_usd)}). Polling will fetch results in the background.`,
      );
      setRaw("");
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded border bg-blue-50 p-3 text-sm text-blue-900">
        Bulk SERP runs through the Standard Queue (~3.3x cheaper than Live, 1–5 min wait per task). Submit up
        to {MAX_KEYWORDS} keywords; a background poller picks up the results. Track progress on the{" "}
        <Link to="/tasks" className="underline">
          Tasks
        </Link>{" "}
        page.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        <BulkKeywordInput
          value={raw}
          onChange={setRaw}
          disabled={busy}
          maxKeywords={MAX_KEYWORDS}
        />
        <div className="flex flex-col gap-3">
          <CostPreview
            action={costAction}
            details={[
              `${keywords.length} keywords`,
              `Depth ${depth}, Standard Queue`,
              `Location ${DEFAULT_LOCATION}, Language ${DEFAULT_LANGUAGE}`,
            ]}
            disabled={keywords.length === 0 || busy}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700">Depth: {depth}</span>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value, 10))}
            />
          </label>
          <button
            type="button"
            onClick={onRun}
            disabled={busy || keywords.length === 0 || keywords.length > MAX_KEYWORDS}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit batch"}
          </button>
        </div>
      </div>

      {lastBatchId && (
        <div className="rounded border bg-slate-50 p-3 text-sm">
          Batch <span className="font-mono">{lastBatchId}</span> submitted.{" "}
          <Link to="/tasks" className="text-blue-600 underline">
            View on Tasks page
          </Link>
        </div>
      )}
    </div>
  );
}
