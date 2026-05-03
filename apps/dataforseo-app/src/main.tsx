import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { initTelemetry } from "./lib/telemetry";
import "./styles/globals.css";

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
