# DataForSEO App (Tier 1 Skeleton)

Lokale Tauri-App als UI-Layer über DataForSEO.

Dieses Skelett implementiert die Modul-Struktur aus
[`docs/DATAFORSEO_ARCHITECTURE.md`](../../docs/DATAFORSEO_ARCHITECTURE.md)
für Tier 1 (Keywords + SERP). Stubs sind explizit als `TODO Tier 1` markiert.

## Was schon drin ist

- **Rust-Backend** (`src-tauri/`):
  - Modul-Layout (api / domain / store / secrets / ratelimit / tasks / commands).
  - `domain::cost` voll implementiert mit Tests (Property + Beispiele).
  - `secrets::keychain` per `keyring`-Crate.
  - `api::client` mit `user_data`-Endpoint (Connectivity-Check).
  - Commands: `save_credentials`, `clear_credentials`, `test_connection`, `estimate_cost`.
  - `AppError` mit `From`-Conversions, via `ts-rs` an Frontend exportierbar.
  - DuckDB-Schema in `migrations/v0001_initial.sql`.
- **Frontend** (`src/`):
  - Vite + React + TS + Tailwind.
  - Router-Skelett mit allen Tier-1-Routes (Stub-Pages).
  - `lib/cost.ts`: TS-Mirror des Rust-Estimators, mit Vitest-Tests, die exakt
    gegen die Rust-Werte spiegeln.
  - `SettingsPage` voll implementiert (Save + Test Connection).
  - `react-hot-toast` für Fehler-/Erfolgs-Toasts.

## Was noch zu tun ist (Tier 1)

Per Architektur-Dokument Teil 14 (Implementation-Milestones):

- **3** API-Client-Methoden (`api/keywords_data.rs`, `api/labs.rs`, `api/serp.rs`).
- **4** Volume-Page E2E (BulkKeywordInput, Cost-Preview, Results, Chart).
- **5** Labs-Endpoints (3 Commands + 3 Tabs).
- **6** SERP Live (Page).
- **7** SERP Task-Pipeline (Schema-Runner, Poller, Events).
- **8** Cache-Layer.
- **9** Usage-Page (Recharts).
- **10** Polish.

## Quickstart

Voraussetzungen: Rust (>= 1.77), Node 20+, Tauri-Prerequisites
([Tauri 2 setup guide](https://v2.tauri.app/start/prerequisites/)).

```bash
cd apps/dataforseo-app
npm install
npm run tauri:dev
```

Vor dem ersten Build: Tauri-Icons unter `src-tauri/icons/` ablegen
(32x32.png, 128x128.png, icon.icns, icon.ico) — z. B. via
`npm run tauri icon path/to/source.png`.

## Tests

```bash
# Frontend
npm run test

# Rust
cd src-tauri && cargo test
```

## Konventionen

- **Default-Modus:** Standard Queue (3,3x günstiger als Live, siehe Mapping Teil 7).
- **Credentials:** Niemals an die Webview. Zugriff nur via Rust → OS-Keychain.
- **Type-Sharing:** `ts-rs` generiert `src/lib/types/` aus Rust-Structs.
  Niemals manuell editieren.
- **Kein Kommentar-Spam:** Code soll selbst-erklärend sein. Comments nur, wo
  ein konkretes Why nicht offensichtlich ist.
