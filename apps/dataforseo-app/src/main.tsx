import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { initI18n } from "./i18n";
import { initTelemetry } from "./lib/telemetry";
import "./styles/globals.css";

// Bring up i18n before React mounts so the first paint is already in
// the right language (otherwise components flicker through the
// fallback locale on first render).
initI18n();

// Opt-in crash reporting. No-op unless both VITE_SENTRY_DSN is set at
// build time AND the user has flipped the Settings toggle. See
// lib/telemetry.ts for the gating logic.
initTelemetry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" />
    </BrowserRouter>
  </React.StrictMode>
);
