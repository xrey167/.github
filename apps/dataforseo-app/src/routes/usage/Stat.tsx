interface Props {
  label: string;
  value: string;
  subline?: string;
}

export default function Stat({ label, value, subline }: Props) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {subline && <div className="mt-1 text-xs text-slate-500">{subline}</div>}
    </div>
  );
}
