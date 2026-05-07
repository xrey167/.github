import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";

// Type-only import — no runtime cost and degrades gracefully if the
// plugin isn't registered (the matching dynamic `import()` inside
// tryCheck() catches the load error).
import type { Update } from "@tauri-apps/plugin-updater";

// One hour between auto-checks. The first check fires on mount.
const POLL_INTERVAL_MS = 60 * 60 * 1000;

async function tryCheck(): Promise<Update | null> {
  try {
    const mod = await import("@tauri-apps/plugin-updater");
    return await mod.check();
  } catch (e) {
    // Silent fail in dev / when the Rust plugin isn't registered. We
    // never want a missing-update-feed to surface as a toast.
    if (typeof console !== "undefined") {
      console.debug("UpdateBanner: check() failed", e);
    }
    return null;
  }
}

async function tryRelaunch(): Promise<void> {
  try {
    const mod = await import("@tauri-apps/plugin-process");
    await mod.relaunch();
  } catch (e) {
    // If the relaunch plugin isn't installed we just ask the user to
    // restart manually. Avoids a hard crash.
    toast(
      "Update installed — please restart the app manually to apply.",
      { icon: "ℹ️" },
    );
    if (typeof console !== "undefined") {
      console.debug("UpdateBanner: relaunch() failed", e);
    }
  }
}

/// Top-of-app banner that polls for available updates and offers a
/// one-click "Install & restart" action. Hidden when no update is
/// available, when the update plugin isn't registered, or when the user
/// dismisses it.
///
/// To activate end-to-end: build the Rust side with `--features updater`,
/// configure `plugins.updater.endpoints` + `plugins.updater.pubkey` in
/// tauri.conf.json (see docs/AUTOUPDATE.md), and ship signed releases.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Clean up the interval on unmount; otherwise StrictMode mounts in
  // dev would cause a double-poll. Use ReturnType<typeof setInterval>
  // since the project may pull in @types/node (where setInterval returns
  // NodeJS.Timeout, not number).
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const u = await tryCheck();
      if (cancelled) return;
      setUpdate(u);
    }

    void poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  if (!update || dismissed) return null;

  async function install() {
    if (!update) return;
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      toast.success("Update installed — restarting…");
      await tryRelaunch();
    } catch (e) {
      toast.error(formatError(e, "Update"));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900"
    >
      <span aria-hidden>⬆️</span>
      <span>
        Version <strong>{update.version}</strong> is available.
        {update.date && (
          <span className="ml-1 text-xs text-blue-800/80">
            (released {update.date.slice(0, 10)})
          </span>
        )}
      </span>
      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={install}
          disabled={installing}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {installing ? "Installing…" : "Install & restart"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          disabled={installing}
          className="rounded border border-blue-200 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-60"
        >
          Later
        </button>
      </div>
    </div>
  );
}
