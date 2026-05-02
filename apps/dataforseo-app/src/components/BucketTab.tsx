interface Props {
  label: string;
  active: boolean;
  onClick: () => void;
}

/// Tiny segmented-button used by the Compare tabs to switch between
/// Common / Only-A / Only-B buckets without re-running the API call.
export default function BucketTab({ label, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-1 text-xs ${
        active ? "border-slate-800 bg-slate-100" : "hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
