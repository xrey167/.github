import { type CostAction, estimate } from "../lib/cost";
import { formatUsd } from "../lib/format";

interface Props {
  action: CostAction;
  details?: string[];
  disabled?: boolean;
}

export default function CostPreview({ action, details, disabled }: Props) {
  const cost = estimate(action);

  return (
    <div
      className={`rounded border bg-slate-50 p-3 text-sm ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-slate-700">Estimated cost</span>
        <span className="font-mono text-base">{formatUsd(cost)}</span>
      </div>
      {details && details.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
