export default function TasksPage() {
  return (
    <section>
      <h2 className="text-xl font-semibold">Tasks</h2>
      <p className="mt-2 text-sm text-slate-600">
        Standard-Queue-Tasks (pending, ready, fetched, failed). Polling-Worker
        läuft im Rust-Backend.
      </p>
    </section>
  );
}
