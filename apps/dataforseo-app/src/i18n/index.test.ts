import { beforeEach, describe, expect, it } from "vitest";

import { getLocale, initI18n, LOCALE_STORAGE_KEY, setLocale } from "./index";

describe("i18n", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initialises once and is idempotent", () => {
    const a = initI18n();
    const b = initI18n();
    expect(a).toBe(b);
    expect(a.isInitialized).toBe(true);
  });

  it("loads german + english bundles with shared keys", () => {
    const i = initI18n();
    expect(i.t("common.save", { lng: "de" })).toBe("Speichern");
    expect(i.t("common.save", { lng: "en" })).toBe("Save");
    expect(i.t("settings.dataforseo.section", { lng: "en" })).toBe("DataForSEO");
  });

  it("interpolates parameters correctly", () => {
    const i = initI18n();
    expect(i.t("settings.dataforseo.connectedAs", { login: "alice", lng: "en" })).toBe(
      "Connected as alice",
    );
    expect(i.t("settings.ai.keySaved", { provider: "anthropic", lng: "de" })).toBe(
      "anthropic-Schlüssel gespeichert",
    );
  });

  it("setLocale persists to localStorage and getLocale reads it back", () => {
    initI18n();
    setLocale("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(getLocale()).toBe("en");
    setLocale("de");
    expect(getLocale()).toBe("de");
  });

  it("getLocale clamps unknown languages to the fallback", () => {
    initI18n();
    // Force-load a language we don't ship to make sure getLocale handles
    // it. (Some users hit this when navigator.language returns "fr".)
    void initI18n().changeLanguage("fr");
    expect(getLocale()).toBe("de");
  });
});
