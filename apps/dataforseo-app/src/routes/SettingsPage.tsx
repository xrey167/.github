import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { formatUsd } from "../lib/format";
import { tauriApi, type AiProviderStatus, type UserInfo } from "../lib/tauri";

export default function SettingsPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const [anthropicKey, setAnthropicKey] = useState("");
  const [aiStatus, setAiStatus] = useState<AiProviderStatus[]>([]);

  useEffect(() => {
    tauriApi.aiProviderStatus().then(setAiStatus).catch(() => undefined);
  }, []);

  async function onSave() {
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

  async function onSaveAnthropic() {
    if (!anthropicKey.trim()) return;
    setBusy(true);
    try {
      await tauriApi.aiSaveProviderKey({ provider: "anthropic", apiKey: anthropicKey });
      setAnthropicKey("");
      setAiStatus(await tauriApi.aiProviderStatus());
      toast.success("Anthropic key gespeichert");
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onClearAnthropic() {
    setBusy(true);
    try {
      await tauriApi.aiClearProviderKey({ provider: "anthropic" });
      setAiStatus(await tauriApi.aiProviderStatus());
      toast.success("Anthropic key entfernt");
    } catch (e) {
      toast.error(`Fehler: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const anthropic = aiStatus.find((s) => s.provider === "anthropic");

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
              onClick={onSave}
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
          Powers /chat. Anthropic Claude is the only provider implemented today;
          OpenAI and Ollama are planned.
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded border bg-slate-50 p-2 text-xs">
            <div>
              <strong>Anthropic:</strong>{" "}
              {anthropic?.configured ? (
                <span className="text-emerald-700">configured ({anthropic.model ?? "model unknown"})</span>
              ) : (
                <span className="text-amber-700">not configured</span>
              )}
            </div>
          </div>
          <label className="block">
            <span className="text-sm text-slate-700">Anthropic API Key</span>
            <input
              type="password"
              className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !anthropicKey.trim()}
              onClick={onSaveAnthropic}
              className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Save key
            </button>
            <button
              type="button"
              disabled={busy || !anthropic?.configured}
              onClick={onClearAnthropic}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
