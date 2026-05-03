import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { getLocale, setLocale, SUPPORTED_LOCALES, type Locale } from "../i18n";
import { formatUsd } from "../lib/format";
import { getCrashReportsOptIn, setCrashReportsOptIn } from "../lib/telemetry";
import { tauriApi, type AiProviderStatus, type UserInfo } from "../lib/tauri";

const LOCALE_LABELS: Record<Locale, string> = { de: "Deutsch", en: "English" };

const PROVIDERS: { id: string; label: string; placeholder: string }[] = [
  { id: "anthropic", label: "Anthropic Claude", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiProviderStatus[]>([]);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [crashReportsOn, setCrashReportsOn] = useState(getCrashReportsOptIn());
  // Track active locale for the picker — `getLocale()` is the source of
  // truth, but we mirror it into local state so the <select> re-renders
  // immediately on change.
  const [locale, setLocaleState] = useState<Locale>(getLocale());

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
      toast.success(t("settings.dataforseo.credentialsSaved"));
      setPassword("");
    } catch (e) {
      toast.error(`${t("common.failed")}: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    try {
      const result = await tauriApi.testConnection();
      setInfo(result);
      toast.success(t("settings.dataforseo.connectedAs", { login: result.login }));
    } catch (e) {
      toast.error(`${t("common.failed")}: ${(e as { message?: string })?.message ?? e}`);
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
      toast.success(t("settings.ai.keySaved", { provider }));
    } catch (e) {
      toast.error(`${t("common.failed")}: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onClearAi(provider: string) {
    setBusy(true);
    try {
      await tauriApi.aiClearProviderKey({ provider });
      await refreshAi();
      toast.success(t("settings.ai.keyRemoved", { provider }));
    } catch (e) {
      toast.error(`${t("common.failed")}: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onActivate(provider: string) {
    setBusy(true);
    try {
      await tauriApi.aiSetActiveProvider({ provider });
      await refreshAi();
      toast.success(t("settings.ai.activated", { provider }));
    } catch (e) {
      toast.error(`${t("common.failed")}: ${(e as { message?: string })?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  const activeProvider = aiStatus.find((s) => s.model != null)?.provider;

  return (
    <section className="flex max-w-md flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold">{t("settings.dataforseo.section")}</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-slate-700">{t("settings.dataforseo.login")}</span>
            <input
              type="text"
              className="mt-1 w-full rounded border px-2 py-1"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">{t("settings.dataforseo.password")}</span>
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
              {t("settings.dataforseo.save")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onTest}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              {t("settings.dataforseo.test")}
            </button>
          </div>

          {info && (
            <div className="mt-4 rounded border bg-slate-50 p-3 text-sm">
              <div>
                <strong>{t("settings.dataforseo.login")}:</strong> {info.login}
              </div>
              <div>
                <strong>{t("settings.dataforseo.balance")}:</strong> {formatUsd(info.balance)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{t("settings.ai.section")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("settings.ai.description")}</p>

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
                            {t("settings.ai.active")} ({status.model ?? t("settings.ai.modelUnknown")})
                          </span>
                        ) : (
                          <span className="text-slate-600">{t("settings.ai.stored")}</span>
                        )
                      ) : (
                        <span className="text-amber-700">{t("settings.ai.noKey")}</span>
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
                      {t("settings.ai.activate")}
                    </button>
                  )}
                </div>
                <label className="mt-2 block">
                  <span className="text-xs text-slate-600">{t("settings.ai.apiKey")}</span>
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
                    {t("settings.ai.saveKey")}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !status?.configured}
                    onClick={() => onClearAi(p.id)}
                    className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                  >
                    {t("settings.ai.remove")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">{t("settings.telemetry.section")}</h3>
        <p className="mt-1 text-xs text-slate-500">{t("settings.telemetry.description")}</p>
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={crashReportsOn}
            onChange={(e) => {
              setCrashReportsOptIn(e.target.checked);
              setCrashReportsOn(e.target.checked);
            }}
          />
          {t("settings.telemetry.checkbox")}
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold">{t("settings.language.section")}</h3>
        <p className="mt-1 text-xs text-slate-500">{t("settings.language.description")}</p>
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <span className="text-slate-700">{t("settings.language.label")}</span>
          <select
            value={locale}
            onChange={(e) => {
              const next = e.target.value as Locale;
              setLocale(next);
              setLocaleState(next);
            }}
            className="rounded border px-2 py-1 text-sm"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold">{t("settings.setup.section")}</h3>
        <p className="mt-1 text-xs text-slate-500">{t("settings.setup.description")}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await tauriApi.clearCredentials();
              window.location.reload();
            } catch (e) {
              toast.error(`${t("common.failed")}: ${(e as { message?: string })?.message ?? e}`);
            }
          }}
          className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          {t("settings.setup.button")}
        </button>
      </div>
    </section>
  );
}
