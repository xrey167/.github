import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { formatUsd } from "../lib/format";
import { getCrashReportsOptIn, setCrashReportsOptIn } from "../lib/telemetry";
import { tauriApi, type AiProviderStatus, type UserInfo } from "../lib/tauri";

const PROVIDERS: { id: string; label: string; placeholder: string }[] = [
  { id: "anthropic", label: "Anthropic Claude", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
];

export default function SettingsPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiProviderStatus[]>([]);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [crashReportsOn, setCrashReportsOn] = useState(getCrashReportsOptIn());

  async function refreshAi() {
    try {
      setAiStatus(await tauriApi.aiProviderStatus());
    } catch {
      setAiStatus([]);
    }
  }

  useEffect(() => {
    refreshAi();
  }, []);

  async function onSaveDataforseo() {
    setBusy(true);
    try {
      await tauriApi.saveCredentials(login, password);
      toast.success("Credentials gespeichert");
      setPassword("");
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    try {
      const result = await tauriApi.testConnection();
      setInfo(result);
      toast.success(`Verbunden als ${result.login}`);
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAi(provider: string) {
    const key = keyDrafts[provider]?.trim();
    if (!key) return;
    setBusy(true);
    try {
      await tauriApi.aiSaveProviderKey({ provider, apiKey: key });
      setKeyDrafts((d) => ({ ...d, [provider]: "" }));
      await refreshAi();
      toast.success(`${provider} key gespeichert`);
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onClearAi(provider: string) {
    setBusy(true);
    try {
      await tauriApi.aiClearProviderKey({ provider });
      await refreshAi();
      toast.success(`${provider} key entfernt`);
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onActivate(provider: string) {
    setBusy(true);
    try {
      await tauriApi.aiSetActiveProvider({ provider });
      await refreshAi();
      toast.success(`${provider} aktiv`);
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const activeProvider = aiStatus.find((s) => s.model != null)?.provider;

  return (
    <section className="flex max-w-md flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold">DataForSEO</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-slate-700">Login</span>
            <input
              type="text"
              className="mt-1 w-full rounded border px-2 py-1"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Password</span>
            <input
              type="password"
              className="mt-1 w-full rounded border px-2 py-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !login || !password}
              onClick={onSaveDataforseo}
              className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onTest}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>

          {info && (
            <div className="mt-4 rounded border bg-slate-50 p-3 text-sm">
              <div>
                <strong>Login:</strong> {info.login}
              </div>
              <div>
                <strong>Balance:</strong> {formatUsd(info.balance)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">AI Chat</h2>
        <p className="mt-1 text-sm text-slate-600">
          Powers /chat. Anthropic and OpenAI both work; pick one as the active
          provider. Keys live in the OS keychain.
        </p>

        <div className="mt-4 space-y-4">
          {PROVIDERS.map((p) => {
            const status = aiStatus.find((s) => s.provider === p.id);
            const isActive = activeProvider === p.id;
            const draft = keyDrafts[p.id] ?? "";
            return (
              <div key={p.id} className="rounded border p-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <strong>{p.label}</strong>
                    <div className="text-xs text-slate-500">
                      {status?.configured ? (
                        isActive ? (
                          <span className="text-emerald-700">
                            active ({status.model ?? "model unknown"})
                          </span>
                        ) : (
                          <span className="text-slate-600">stored, inactive</span>
                        )
                      ) : (
                        <span className="text-amber-700">no key stored</span>
                      )}
                    </div>
                  </div>
                  {status?.configured && !isActive && (
                    <button
                      type="button"
                      onClick={() => onActivate(p.id)}
                      disabled={busy}
                      className="rounded border px-2 py-0.5 text-xs disabled:opacity-50"
                    >
                      Activate
                    </button>
                  )}
                </div>
                <label className="mt-2 block">
                  <span className="text-xs text-slate-600">API Key</span>
                  <input
                    type="password"
                    className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
                    value={draft}
                    onChange={(e) =>
                      setKeyDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    placeholder={p.placeholder}
                    autoComplete="off"
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !draft.trim()}
                    onClick={() => onSaveAi(p.id)}
                    className="rounded bg-slate-800 px-3 py-1 text-xs text-white disabled:opacity-50"
                  >
                    Save key
                  </button>
                  <button
                    type="button"
                    disabled={busy || !status?.configured}
                    onClick={() => onClearAi(p.id)}
                    className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Crash reports</h3>
        <p className="mt-1 text-xs text-slate-500">
          Opt in to send crash reports to help improve the app. Disabled by default —
          credentials and request payloads are scrubbed before send. Requires a build-time
          VITE_SENTRY_DSN to actually transmit anything; you'll just see a debug log
          otherwise.
        </p>
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={crashReportsOn}
            onChange={(e) => {
              setCrashReportsOptIn(e.target.checked);
              setCrashReportsOn(e.target.checked);
            }}
          />
          Send crash reports
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Setup</h3>
        <p className="mt-1 text-xs text-slate-500">
          Re-run the first-run wizard to change credentials, budget, or pick a different
          starter project. Existing data is left untouched.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await tauriApi.clearCredentials();
              window.location.reload();
            } catch (e) {
              toast.error(`Failed: ${(e as { message?: string })?.message ?? e}`);
            }
          }}
          className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Re-run onboarding
        </button>
      </div>
    </section>
  );
}
