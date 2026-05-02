import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CostPreview from "../components/CostPreview";
import { type CostAction } from "../lib/cost";
import { formatUsd } from "../lib/format";
import {
  tauriApi,
  type TechnologiesView,
  type WhoisView,
} from "../lib/tauri";

type Tab = "whois" | "technologies";

export default function DomainAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("whois");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold">Domain Analytics</h2>
        <p className="text-sm text-slate-600">
          Two cheap one-shot lookups: registrar / WHOIS overview (0.0001 USD)
          and the tech stack a domain is running (0.001 USD). Useful as a
          quick prelude to the deeper Backlinks / SERP work.
        </p>
      </header>

      <nav className="flex gap-1 border-b text-sm">
        <TabButton active={tab === "whois"} onClick={() => setTab("whois")}>
          WHOIS
        </TabButton>
        <TabButton
          active={tab === "technologies"}
          onClick={() => setTab("technologies")}
        >
          Technologies
        </TabButton>
      </nav>

      {tab === "whois" ? <WhoisTab /> : <TechnologiesTab />}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 ${
        active
          ? "border-slate-800 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- WHOIS ----------

function WhoisTab() {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<WhoisView | null>(null);

  async function onRun() {
    const trimmed = domain.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.whoisOverview({ domain: trimmed });
      setView(result);
      toast.success(`Loaded WHOIS for ${trimmed} (${formatUsd(result.cost_usd)})`);
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Inputs
        domain={domain}
        setDomain={setDomain}
        busy={busy}
        onRun={onRun}
        runLabel="Lookup WHOIS"
        cost={{ kind: "DomainAnalyticsWhois", rows: 1 }}
        details={["Single-domain lookup", "0.0001 USD per row"]}
      />

      {view && view.item ? (
        <WhoisResult view={view} />
      ) : view ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          No WHOIS data returned for {view.domain} (unregistered or
          privacy-shielded).
        </div>
      ) : (
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Enter a domain to look up its WHOIS record.
          </div>
        )
      )}
    </div>
  );
}

function WhoisResult({ view }: { view: WhoisView }) {
  const item = view.item ?? {};
  const get = (k: string): string | null => {
    const v = (item as Record<string, unknown>)[k];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    return null;
  };
  const arr = (k: string): string[] => {
    const v = (item as Record<string, unknown>)[k];
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string");
  };
  const dateOnly = (k: string) => {
    const s = get(k);
    return s ? s.slice(0, 10) : null;
  };

  const tiles: Array<{ label: string; value: string | null }> = [
    { label: "Registrar", value: get("registrar") },
    { label: "Created", value: dateOnly("created_datetime") },
    { label: "Updated", value: dateOnly("changed_datetime") },
    { label: "Expires", value: dateOnly("expiration_datetime") },
    { label: "Registrar IANA ID", value: get("registrar_iana_id") },
    { label: "Country", value: get("country_iso_code") },
  ];

  const nameServers = arr("name_servers");
  const status = arr("status");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.domain}</strong>
        <span className="ml-auto">
          actual {formatUsd(view.cost_usd)} · estimated{" "}
          {formatUsd(view.estimated_usd)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded border bg-white p-3">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="mt-1 text-sm font-semibold">{t.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {nameServers.length > 0 && (
        <div className="rounded border bg-white p-3">
          <div className="text-xs text-slate-500">Name servers</div>
          <ul className="mt-1 list-disc pl-5 text-sm font-mono">
            {nameServers.map((ns) => (
              <li key={ns}>{ns}</li>
            ))}
          </ul>
        </div>
      )}

      {status.length > 0 && (
        <div className="rounded border bg-white p-3">
          <div className="text-xs text-slate-500">Status flags</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {status.map((s) => (
              <span
                key={s}
                className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          Raw response (debug)
        </summary>
        <pre className="mt-2 overflow-x-auto text-[11px]">
          {JSON.stringify(view.item, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ---------- Technologies ----------

function TechnologiesTab() {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<TechnologiesView | null>(null);

  async function onRun() {
    const trimmed = domain.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await tauriApi.domainTechnologies({ domain: trimmed });
      setView(result);
      toast.success(
        `Loaded tech stack for ${trimmed} (${formatUsd(result.cost_usd)})`,
      );
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Inputs
        domain={domain}
        setDomain={setDomain}
        busy={busy}
        onRun={onRun}
        runLabel="Detect technologies"
        cost={{ kind: "DomainAnalyticsTechnologies" }}
        details={["Single request, flat fee", "Returns tech stack by category"]}
      />

      {view ? (
        <TechnologiesResult view={view} />
      ) : (
        !busy && (
          <div className="rounded border bg-white p-8 text-center text-sm text-slate-500">
            Enter a domain to detect its technology stack.
          </div>
        )
      )}
    </div>
  );
}

function TechnologiesResult({ view }: { view: TechnologiesView }) {
  // result.technologies is a map keyed by category → object whose values
  // are arrays of tech names. We flatten it to {category, names[]}.
  const groups = useMemo(() => {
    const tech = (view.result as Record<string, unknown> | null)?.[
      "technologies"
    ];
    if (!tech || typeof tech !== "object") return [];
    return Object.entries(tech as Record<string, unknown>)
      .map(([category, sub]) => {
        const names: string[] = [];
        if (sub && typeof sub === "object") {
          for (const value of Object.values(sub as Record<string, unknown>)) {
            if (Array.isArray(value)) {
              for (const n of value) {
                if (typeof n === "string") names.push(n);
              }
            }
          }
        }
        return { category, names: Array.from(new Set(names)).sort() };
      })
      .filter((g) => g.names.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [view]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <strong className="font-mono text-slate-700">{view.domain}</strong>
        <span className="ml-auto">
          actual {formatUsd(view.cost_usd)} · estimated{" "}
          {formatUsd(view.estimated_usd)}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-slate-500">
          No technologies detected for {view.domain}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.category} className="rounded border bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {g.category.replace(/_/g, " ")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {g.names.map((n) => (
                  <span
                    key={n}
                    className="rounded bg-slate-100 px-2 py-0.5 text-xs"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="rounded border bg-slate-50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          Raw response (debug)
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto text-[11px]">
          {JSON.stringify(view.result, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ---------- Shared inputs (small enough that copying it once into each
// tab would have been fine, but the page reads cleaner with a single
// definition since both tabs have identical input layout) ----------

function Inputs(props: {
  domain: string;
  setDomain: (v: string) => void;
  busy: boolean;
  onRun: () => void;
  runLabel: string;
  cost: CostAction;
  details: string[];
}) {
  const { domain, setDomain, busy, onRun, runLabel, cost, details } = props;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Domain</span>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          disabled={busy}
          className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
          placeholder="example.com"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <div className="flex flex-col gap-3">
        <CostPreview action={cost} details={details} disabled={busy || !domain.trim()} />
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !domain.trim()}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Loading…" : runLabel}
        </button>
      </div>
    </div>
  );
}
