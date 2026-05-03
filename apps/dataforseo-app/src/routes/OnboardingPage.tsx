import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { tauriApi } from "../lib/tauri";

type StepId = "welcome" | "credentials" | "budget" | "project" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "credentials", label: "Credentials" },
  { id: "budget", label: "Budget" },
  { id: "project", label: "First project" },
  { id: "done", label: "Done" },
];

interface Props {
  /// Called after the final step completes; the host should refetch
  /// connection state and unmount this page in favor of the main app.
  onComplete: () => void;
}

/// First-run setup. Forces the user through (1) DataForSEO credentials,
/// (2) an advisory daily budget, and (3) a first tracked-domain project
/// before unblocking the main app. The Settings page exposes a
/// "Re-run onboarding" button that re-renders this if the user later
/// wants to change targets.
export default function OnboardingPage({ onComplete }: Props) {
  const [active, setActive] = useState<StepId>("welcome");

  // Credentials
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Budget
  const [dailyLimit, setDailyLimit] = useState("5");
  const [alertAt, setAlertAt] = useState("80");

  // Project
  const [projectTarget, setProjectTarget] = useState("");
  const [projectName, setProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  async function onVerifyCredentials() {
    if (!login.trim() || !password) {
      toast.error("Login and password required");
      return;
    }
    setVerifying(true);
    try {
      await tauriApi.saveCredentials(login.trim(), password);
      const info = await tauriApi.testConnection();
      toast.success(`Connected as ${info.login} · balance ${info.balance.toFixed(2)} USD`);
      setActive("budget");
    } catch (e) {
      toast.error(`Verification failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setVerifying(false);
    }
  }

  async function onSetBudget() {
    const limit = parseFloat(dailyLimit);
    const pct = parseFloat(alertAt);
    if (!Number.isFinite(limit) || limit <= 0) {
      toast.error("Limit must be a positive number");
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast.error("Alert threshold must be between 1 and 100");
      return;
    }
    try {
      await tauriApi.setBudget({
        budget: { period: "daily", limit_usd: limit, alert_at_pct: pct },
      });
      toast.success(`Daily budget set to ${limit.toFixed(2)} USD`);
      setActive("project");
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    }
  }

  async function onCreateProject() {
    const target = projectTarget.trim();
    const name = projectName.trim() || target;
    if (!target) {
      toast.error("Target domain required");
      return;
    }
    setCreatingProject(true);
    try {
      await tauriApi.projectsCreate({ name, target });
      toast.success(`Project "${name}" created`);
      setActive("done");
    } catch (e) {
      toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setCreatingProject(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-2xl rounded border bg-white p-8 shadow-sm">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Welcome to DataForSEO</h1>
          <p className="text-sm text-slate-600">
            Three quick steps to get you set up. You can change everything later in Settings.
          </p>
        </header>

        <Stepper active={active} />

        <div className="mt-6">
          {active === "welcome" && (
            <section className="flex flex-col gap-3 text-sm">
              <p>
                This is a local Tauri app that wraps the DataForSEO API to give you a SEMrush
                replacement at ~15× lower cost. Your credentials never leave the OS keychain;
                every API call is metered and cached so repeat lookups cost nothing.
              </p>
              <p>
                You'll need a DataForSEO account. Sign up at{" "}
                <a
                  href="https://app.dataforseo.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  app.dataforseo.com/register
                </a>{" "}
                — they require a 50 USD minimum deposit and a 100 USD/month spend on the
                Backlinks family if you use it.
              </p>
              <button
                type="button"
                onClick={() => setActive("credentials")}
                className="mt-3 self-end rounded bg-slate-800 px-4 py-2 text-sm text-white"
              >
                Get started →
              </button>
            </section>
          )}

          {active === "credentials" && (
            <section className="flex flex-col gap-3 text-sm">
              <p className="text-slate-600">
                Paste the API login and password from your DataForSEO dashboard. They're stored
                in the OS keychain (macOS Keychain / Windows Credential Manager / Linux
                Secret Service) and never written to disk in plaintext.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">API login (email)</span>
                <input
                  type="email"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={verifying}
                  className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
                  placeholder="you@company.com"
                  autoComplete="username"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">API password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={verifying}
                  className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
                  autoComplete="current-password"
                />
              </label>
              <div className="mt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActive("welcome")}
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onVerifyCredentials}
                  disabled={verifying || !login.trim() || !password}
                  className="rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {verifying ? "Verifying…" : "Verify & continue →"}
                </button>
              </div>
            </section>
          )}

          {active === "budget" && (
            <section className="flex flex-col gap-3 text-sm">
              <p className="text-slate-600">
                Set a daily spend cap. The Usage page warns at the alert threshold and turns red
                when exceeded — but it's advisory only; calls aren't actually blocked, since
                you might want to bust through for a one-off.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-700">Daily limit (USD)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-700">Alert at (%)</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={alertAt}
                    onChange={(e) => setAlertAt(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Typical daily spend during active research: 0.10–0.50 USD. Leave at 5 USD/day if
                unsure — you can always adjust on /usage later.
              </p>
              <div className="mt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActive("credentials")}
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onSetBudget}
                  className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
                >
                  Set budget →
                </button>
              </div>
            </section>
          )}

          {active === "project" && (
            <section className="flex flex-col gap-3 text-sm">
              <p className="text-slate-600">
                Pick the first domain you want to track. A project groups all the keyword
                tracking, audits, and brand-monitoring data for one site. You can add more
                projects later via the sidebar switcher.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">Target domain</span>
                <input
                  type="text"
                  value={projectTarget}
                  onChange={(e) => setProjectTarget(e.target.value)}
                  disabled={creatingProject}
                  className="rounded border px-2 py-1 font-mono text-sm disabled:bg-slate-50"
                  placeholder="example.com"
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">
                  Project name <span className="text-slate-400">(optional)</span>
                </span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={creatingProject}
                  className="rounded border px-2 py-1 text-sm disabled:bg-slate-50"
                  placeholder={projectTarget || "Defaults to the domain"}
                  autoComplete="off"
                />
              </label>
              <div className="mt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActive("budget")}
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onCreateProject}
                  disabled={creatingProject || !projectTarget.trim()}
                  className="rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {creatingProject ? "Creating…" : "Create project →"}
                </button>
              </div>
            </section>
          )}

          {active === "done" && (
            <section className="flex flex-col gap-3 text-center text-sm">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-semibold">You're all set</h2>
              <p className="text-slate-600">
                Credentials saved · daily budget configured · first project created. Open
                /keywords to start researching, /tracking to monitor positions daily, or /audit
                for a full-site SEO crawl.
              </p>
              <button
                type="button"
                onClick={onComplete}
                className="mt-3 self-center rounded bg-slate-800 px-5 py-2 text-sm text-white"
              >
                Open the app
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ active }: { active: StepId }) {
  const activeIdx = STEPS.findIndex((s) => s.id === active);
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                current
                  ? "border-slate-800 bg-slate-800 text-white"
                  : done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 text-slate-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`${
                current ? "font-medium text-slate-800" : "text-slate-500"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-slate-300">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

/// Helper for App.tsx: returns true once `tauriApi.testConnection` succeeds,
/// false once it errors with auth, and null while pending. The host
/// component decides whether to render OnboardingPage or the main UI.
export function useOnboardingGate() {
  const [status, setStatus] = useState<"loading" | "ready" | "needs-onboarding">("loading");

  useEffect(() => {
    let cancelled = false;
    tauriApi
      .testConnection()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("needs-onboarding");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return [status, () => setStatus("ready")] as const;
}
