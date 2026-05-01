import { useMemo } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxKeywords?: number;
}

export function parseKeywords(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
}

export default function BulkKeywordInput({
  value,
  onChange,
  disabled,
  maxKeywords = 1000,
}: Props) {
  const keywords = useMemo(() => parseKeywords(value), [value]);
  const overLimit = keywords.length > maxKeywords;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="bulk-keywords" className="text-sm font-medium text-slate-700">
        Keywords (one per line)
      </label>
      <textarea
        id="bulk-keywords"
        rows={8}
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
        placeholder="seo agentur&#10;dataforseo&#10;keyword research"
      />
      <div
        className={`flex items-center justify-between text-xs ${
          overLimit ? "text-red-600" : "text-slate-500"
        }`}
      >
        <span>
          {keywords.length} unique keyword{keywords.length === 1 ? "" : "s"}
        </span>
        {overLimit && (
          <span>Maximum {maxKeywords} keywords per request</span>
        )}
      </div>
    </div>
  );
}
