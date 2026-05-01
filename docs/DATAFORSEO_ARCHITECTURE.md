# DataForSEO Tauri-App: Architektur (Tier 1 Skelett)

**Projektkontext:** Konkrete technische Architektur für die in `DATAFORSEO_API_MAPPING.md` definierten Tier-1-Endpunkte. Internes Tool für BlueBranch / Kingline + späteres SaaS-Produkt.

**Stand:** Mai 2026.
**Scope dieses Dokuments:** Tier 1 (Keywords + SERP). Backlinks, On-Page, Bing, Maps explizit ausgespart — aber Architektur-Seams für deren spätere Integration werden in Teil 13 dokumentiert.

---

## Teil 0: Scope & Out-of-Scope

### In Scope (Tier 1)

Die sechs Endpunkte aus dem Mapping-Dokument:

1. `keywords_data/google_ads/search_volume/live`
2. `dataforseo_labs/google/keyword_suggestions/live`
3. `dataforseo_labs/google/related_keywords/live`
4. `dataforseo_labs/google/ranked_keywords/live`
5. `serp/google/organic/live/regular`
6. `serp/google/organic/task_post` + `tasks_ready` + `task_get`

Plus Querschnitts-Komponenten:

- Tauri-Shell (Rust-Backend, Webview-Frontend)
- React-Frontend (TypeScript + Vite + Tailwind/shadcn)
- DuckDB als lokale persistente Schicht (Cache + Cost-Ledger)
- OS-Keychain für Credentials
- Cost-Estimator (Pre-Call-Vorschau + Post-Call-Buchung)
- Rate-Limiter (Token-Bucket pro Endpoint-Familie)
- Standard-Queue-Task-Pipeline (für SERP-Bulk)

### Out of Scope (Phase 2/3)

- Backlinks-API, On-Page-API, Lighthouse
- Visueller Filter-Builder (kommt mit Backlinks/Labs-`filters[]`)
- Bing/Yahoo/Yandex-SERP, Google Maps/Shopping/News
- Multi-Account / Multi-Tenant
- Cloud-Sync, Webhooks, Server-Komponente
- E2E-Test-Suite (Tauri-WebDriver in 2026 noch instabil)

---

## Teil 1: System-Architektur

### High-Level-Schichten

```
┌────────────────────────────────────────────────┐
│  React UI  (Vite + TS + Tailwind/shadcn)       │
│  Routes, Forms, Tables, Charts, Toasts         │
└──────────────┬─────────────────────────────────┘
               │   tauri.invoke()  (typisierte Commands)
┌──────────────▼─────────────────────────────────┐
│  Rust Backend  (single crate, src-tauri)       │
│  ┌────────────┬───────────┬─────────────────┐  │
│  │ commands/  │ domain/   │ tasks/ (poller) │  │
│  ├────────────┼───────────┼─────────────────┤  │
│  │ api/       │ store/    │ ratelimit/      │  │
│  ├────────────┼───────────┼─────────────────┤  │
│  │ secrets/   │ telemetry/│ errors          │  │
│  └────────────┴───────────┴─────────────────┘  │
└──────────────┬─────────────────────────────────┘
               │
       ┌───────▼────────┐         ┌──────────────┐
       │ DataForSEO API │         │ DuckDB-File  │
       │   (HTTPS)      │         │ (~/.local/…) │
       └────────────────┘         └──────────────┘
                                         │
                                  ┌──────▼─────────┐
                                  │  OS-Keychain   │
                                  │ (Login + Pass) │
                                  └────────────────┘
```

### Schicht-Verantwortung

| Schicht | Verantwortet | Darf NICHT |
|---|---|---|
| `commands/` | Glue: Argumente validieren, andere Schichten orchestrieren, Result mappen. | Geschäftslogik enthalten oder direkt HTTP machen. |
| `api/` | DataForSEO-HTTP-Verträge, Auth-Header, Response-Deserialisierung. | DuckDB anfassen oder UI-Strings produzieren. |
| `domain/` | Reine Logik: Cost-Estimator, Validierung, Rate-Policies, Newtypes. | I/O machen. Komplett pure & test-bar ohne Mocks. |
| `store/` | DuckDB-Zugriff, Migrationen, Cache-Lookups. | API-Calls oder Scheduling. |
| `secrets/` | Keychain-Lese/Schreib-Zugriff. | Credentials je in Logs/Webview leaken. |
| `ratelimit/` | Token-Bucket pro Family. | Geschäftslogik. |
| `tasks/` | Background-Polling für Standard-Queue. | UI-State direkt mutieren — nur via Events. |

Diese strikte Trennung ist die wichtigste Architektur-Investition. Sie ermöglicht: (a) reine Domain-Tests ohne Tauri-Bootstrap, (b) Austausch der Store-Schicht (z. B. SQLite statt DuckDB) ohne Geschäftslogik anzufassen, (c) klare Diff-Reviews (jeder Endpoint = ein PR pro Schicht).

---

## Teil 2: Modul-Struktur

### Rust (`src-tauri/src/`)

```
src/
├── main.rs                  # Tauri-Entry, registriert alle Commands
├── lib.rs                   # Re-Exports für Tests
├── state.rs                 # AppState (Arc<Client>, Arc<Store>, Arc<Scheduler>)
├── api/
│   ├── mod.rs
│   ├── client.rs            # reqwest::Client + Basic-Auth + Tracing
│   ├── error.rs             # ApiError (Network | Auth | RateLimited | BadResponse)
│   ├── keywords_data.rs     # Google Ads search_volume (live + standard)
│   ├── labs.rs              # keyword_suggestions, related, ranked
│   └── serp.rs              # organic/live/regular + task_post + tasks_ready + task_get
├── domain/
│   ├── mod.rs
│   ├── cost.rs              # estimate(action) -> f64
│   ├── rate.rs              # Family -> RateLimit (max_per_minute, max_concurrent)
│   ├── validation.rs        # Keyword-Listen, Domain-URLs, Location-Codes
│   └── types.rs             # Newtypes: Keyword, LocationCode, LanguageCode, Domain
├── store/
│   ├── mod.rs
│   ├── schema.rs            # Migrationen (v0001.sql, v0002.sql, ...)
│   ├── keywords_cache.rs    # get_volume / put_volume (30d TTL)
│   ├── serp_tasks.rs        # CRUD für serp_tasks-Tabelle
│   ├── serp_results.rs      # Insert + Query nach task_id
│   └── ledger.rs            # api_calls Inserts + Aggregate-Queries
├── secrets/
│   ├── mod.rs
│   └── keychain.rs          # `keyring`-Crate-Wrapper
├── ratelimit/
│   ├── mod.rs
│   └── scheduler.rs         # Token-Bucket pro Family, tokio-async
├── tasks/
│   ├── mod.rs
│   └── poller.rs            # Tokio-Task: tasks_ready -> task_get-Loop
├── telemetry/
│   ├── mod.rs
│   └── tracing.rs           # tracing-subscriber Setup, File-Appender
├── errors.rs                # AppError (UI-facing) + From-Conversions
└── commands/
    ├── mod.rs
    ├── auth.rs              # save_credentials, test_connection, clear_credentials
    ├── keywords.rs          # 4 Commands für Keywords/Labs
    ├── serp.rs              # 3 Commands für SERP
    └── ledger.rs            # estimate_cost, get_recent_calls, get_usage_summary
```

Genau ein Crate. Keine Workspace-Splits in Tier 1 — die Trennung läuft über Module, nicht Crates. Workspace-Split kommt, wenn das `domain/`-Modul gross genug ist, dass Compile-Zeiten nerven (Erfahrungswert: ab ~5k LOC).

### Frontend (`src/`)

```
src/
├── main.tsx                 # Vite-Entry
├── App.tsx                  # Router-Shell + Layout (Sidebar, Tasks-Panel)
├── routes/
│   ├── KeywordsPage.tsx     # Tabs: Volume, Discover, Related
│   ├── DomainPage.tsx       # ranked_keywords + Summary
│   ├── SerpPage.tsx         # Quick + Bulk
│   ├── TasksPage.tsx        # Laufende & abgeschlossene Standard-Queue-Tasks
│   ├── UsagePage.tsx        # Cost-Ledger-Dashboard
│   └── SettingsPage.tsx     # Credentials, Defaults (Mode, Locale)
├── components/
│   ├── BulkKeywordInput.tsx # Multi-Line-Textarea + Counter + Validierung
│   ├── CostPreview.tsx      # Pre-Call-Schätzung, debounced
│   ├── ResultsTable.tsx     # tanstack-table + virtual scrolling
│   ├── ChartCard.tsx        # recharts-Wrapper für 24-mo-Trends
│   ├── ModeToggle.tsx       # Standard/Live-Switch (Default Standard)
│   ├── LocationPicker.tsx   # Country/Language-Combobox
│   └── StatusBadge.tsx      # Pending/Ready/Failed-Pills
├── lib/
│   ├── tauri.ts             # Typisierte Wrapper um invoke() — eine Funktion pro Command
│   ├── types.ts             # AUTOGENERIERT via ts-rs aus Rust-Structs
│   ├── cost.ts              # Client-Mirror des Rust-Estimators (debounced)
│   ├── format.ts            # USD-Format, Datum, Big-Number-Abkürzung
│   └── errors.ts            # AppError -> User-Toast-String
├── hooks/
│   ├── useTaskUpdates.ts    # listen() auf "task_progress"-Events
│   └── useCredentials.ts
└── styles/
    └── globals.css
```

---

## Teil 3: Tauri-Command-Surface

Die Vertragsfläche zwischen Rust und React. Jedes Command hat exakt eine Verantwortung und gibt ein typisiertes Result zurück.

### Auth

```rust
#[tauri::command]
async fn save_credentials(login: String, password: String) -> Result<(), AppError>;

#[tauri::command]
async fn clear_credentials() -> Result<(), AppError>;

#[tauri::command]
async fn test_connection() -> Result<UserInfo, AppError>;
//   ruft GET /v3/appendix/user_data, gibt { login, money: { balance, ... } } zurück
```

### Keywords / Labs

```rust
#[tauri::command]
async fn keywords_search_volume(
    keywords: Vec<String>,         // bis 1000
    location_code: u32,
    language_code: String,
    use_cache: bool,               // true = bevorzuge 30d-Cache
) -> Result<KeywordVolumeBatch, AppError>;

#[tauri::command]
async fn keywords_suggestions(
    seed: String,
    location_code: u32,
    language_code: String,
    limit: u32,                    // default 100
) -> Result<Vec<KeywordSuggestion>, AppError>;

#[tauri::command]
async fn keywords_related(
    seed: String,
    location_code: u32,
    language_code: String,
    depth: u32,                    // 1..=4 — multipliziert Volumen
) -> Result<Vec<RelatedKeyword>, AppError>;

#[tauri::command]
async fn keywords_for_domain(
    domain: String,
    location_code: u32,
    language_code: String,
    limit: u32,
) -> Result<Vec<RankedKeyword>, AppError>;
```

### SERP

```rust
#[tauri::command]
async fn serp_live(
    keyword: String,
    location_code: u32,
    language_code: String,
    depth: u32,                    // 10..=100
) -> Result<SerpResult, AppError>;

#[tauri::command]
async fn serp_task_create(
    keywords: Vec<String>,         // bis ~100 pro Batch
    location_code: u32,
    language_code: String,
    depth: u32,
) -> Result<TaskBatchId, AppError>;

#[tauri::command]
async fn serp_task_status(batch_id: String) -> Result<TaskBatchStatus, AppError>;
//   Liefert pro Task: pending | ready | fetched | failed + Resultate sofern vorhanden
```

### Ledger / Settings

```rust
#[tauri::command]
async fn estimate_cost(action: CostAction) -> Result<f64, AppError>;

#[tauri::command]
async fn get_recent_calls(limit: u32) -> Result<Vec<CallLogEntry>, AppError>;

#[tauri::command]
async fn get_usage_summary(days: u32) -> Result<UsageSummary, AppError>;
//   Aggregat: pro Endpoint Anzahl + Summe in USD
```

### Type-Sharing-Strategie

**`ts-rs`-Crate** generiert TypeScript-Definitionen aus den Rust-Structs zur Build-Zeit. Output landet in `src/lib/types.ts`. Single source of truth. Einsparung: ~200 Zeilen manuell synchronisierter TS-Typen entfallen, plus Rename-Refactors propagieren automatisch über die Sprachgrenze.

**Workflow:** `cargo test --features ts-export` in einem `pre-commit`-Hook regeneriert `types.ts`. CI bricht ab, wenn der File nicht commited ist.

---

## Teil 4: DuckDB-Schema

### Warum DuckDB statt SQLite?

| Kriterium | SQLite | DuckDB | Entscheidung |
|---|---|---|---|
| Embedded, keine Server-Komponente | ✓ | ✓ | unentschieden |
| OLTP (kleine, häufige Schreibvorgänge) | ✓ | ⚠️ | SQLite besser |
| OLAP-Aggregate (Usage-Reports) | ⚠️ | ✓ | DuckDB deutlich besser |
| JSON-Spalten (für `monthly_searches`) | ⚠️ | ✓ | DuckDB nativ |
| Kompression Keyword-Listen | nein | ja (columnar) | DuckDB |
| Crate-Reife in Rust 2026 | ausgereift | gut | beide ok |

DuckDB gewinnt, weil die App zu 80 % analytische Queries fährt (Cache-Lookup, Usage-Stats). Schreibvorgänge sind selten und gepuffert. Für Tier 3 (On-Page mit potenziell zehntausenden Page-Rows) ist DuckDB strikt überlegen.

**Migrationspfad:** Falls DuckDB-Crate sich als Problem zeigt (Bundle-Size oder Plattform-Issues), kann der `store/`-Trait identisch von SQLite re-implementiert werden. Genau wofür die Schicht-Trennung da ist.

### Tabellen (Tier 1)

```sql
-- Settings als KV-Store (schema_version, default_mode, default_location, ...)
CREATE TABLE settings (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL
);

-- Cost-Ledger: jede API-Antwort wird hier gebucht
CREATE TABLE api_calls (
    id BIGINT PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR NOT NULL,            -- z.B. "google_ads.search_volume"
    mode VARCHAR NOT NULL,                -- "live" | "standard" | "priority"
    cost_usd DOUBLE NOT NULL,             -- aus dem 'cost'-Feld der Response
    estimated_usd DOUBLE,                 -- was der Estimator vor dem Call sagte
    request_size INTEGER,                 -- Keywords/Domains/URLs im Request
    response_status INTEGER,
    duration_ms INTEGER,
    task_id VARCHAR,                      -- nur bei Standard-Queue
    error VARCHAR                         -- bei Fehlern: Kurz-Beschreibung
);
CREATE INDEX api_calls_ts_idx ON api_calls(ts);
CREATE INDEX api_calls_endpoint_idx ON api_calls(endpoint);

-- Keyword-Volume-Cache: 30 Tage TTL, opt-in Stale-Read
CREATE TABLE keyword_volume_cache (
    keyword VARCHAR NOT NULL,
    location_code INTEGER NOT NULL,
    language_code VARCHAR NOT NULL,
    search_volume INTEGER,
    competition VARCHAR,                  -- LOW | MEDIUM | HIGH
    competition_index INTEGER,            -- 0..100
    cpc DOUBLE,
    low_top_of_page_bid DOUBLE,
    high_top_of_page_bid DOUBLE,
    monthly_searches JSON,                -- Array von { year, month, search_volume }
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (keyword, location_code, language_code)
);

-- Standard-Queue-SERP: persistente Task-Verfolgung
CREATE TABLE serp_tasks (
    task_id VARCHAR PRIMARY KEY,          -- DataForSEOs task_id
    batch_id VARCHAR NOT NULL,            -- gruppiert mehrere task_post-Calls einer User-Aktion
    keyword VARCHAR NOT NULL,
    location_code INTEGER NOT NULL,
    language_code VARCHAR NOT NULL,
    depth INTEGER NOT NULL,
    status VARCHAR NOT NULL,              -- pending | ready | fetched | failed
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fetched_at TIMESTAMP,
    last_polled_at TIMESTAMP,
    poll_attempts INTEGER DEFAULT 0,
    cost_usd DOUBLE,
    error VARCHAR
);
CREATE INDEX serp_tasks_batch_idx ON serp_tasks(batch_id);
CREATE INDEX serp_tasks_status_idx ON serp_tasks(status);

-- SERP-Resultate (organic + featured + paid in einer Tabelle, type-Discriminator)
CREATE TABLE serp_results (
    task_id VARCHAR NOT NULL,
    position INTEGER NOT NULL,            -- 1-basiert
    type VARCHAR NOT NULL,                -- organic | featured_snippet | people_also_ask | paid
    url VARCHAR,
    title VARCHAR,
    description VARCHAR,
    domain VARCHAR,                       -- aus url extrahiert für schnelle GROUP BY
    extra JSON,                           -- type-spezifische Felder
    PRIMARY KEY (task_id, position)
);
CREATE INDEX serp_results_domain_idx ON serp_results(domain);
```

### Migrationen

Eigenes simples Schema, kein ORM:

- `src-tauri/migrations/v0001_initial.sql`: Tabellen oben.
- Beim App-Start: `SELECT value FROM settings WHERE key='schema_version'`. Falls < latest, alle fehlenden Migrationen in Reihenfolge ausführen, dann Version setzen.
- Migrationen sind **append-only**. Niemals einen bestehenden Migration-File ändern. Schema-Änderung = neue Migration.

### Cache-Policy

| Daten | TTL | Begründung |
|---|---|---|
| `keyword_volume_cache` | 30 Tage frisch, opt-in Stale | Google-Ads-Volumen ändert sich monatlich |
| `serp_results` | nicht gecacht (per Definition real-time) | Live-SERP per Definition zeitkritisch |
| `api_calls` | unbegrenzt (Audit-Trail) | Reporting-Bedarf |
| `serp_tasks` mit status='fetched' | 90 Tage, dann Vacuum | History für Re-Visit, kein Vendor-Lock |

---

## Teil 5: Cost-Estimator (Implementation)

Pure Funktion in `domain/cost.rs`, beide Seiten (Rust + TS) implementieren denselben Algorithmus.

### Rust

```rust
#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub enum Mode { Live, Priority, Standard }

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub enum CostAction {
    KeywordsSearchVolume { count: u32, mode: Mode },
    KeywordsSuggestions  { mode: Mode },          // Pauschale
    KeywordsRelated      { depth: u32, mode: Mode },
    KeywordsForDomain    { mode: Mode },
    Serp { count: u32, mode: Mode, depth: u32, extra_params: u32 },
}

pub fn estimate(action: &CostAction) -> f64 {
    use CostAction::*;
    match action {
        KeywordsSearchVolume { count, mode } => {
            let base = match mode { Mode::Live => 0.075, _ => 0.05 };
            let requests = (*count as f64 / 1000.0).ceil();
            requests * base
        }
        KeywordsSuggestions { mode } => match mode { Mode::Live => 0.0125, _ => 0.0075 },
        KeywordsRelated { depth, mode } => {
            let base = match mode { Mode::Live => 0.0125, _ => 0.0075 };
            base * (*depth as f64)
        }
        KeywordsForDomain { mode } => match mode { Mode::Live => 0.0125, _ => 0.0075 },
        Serp { count, mode, depth, extra_params } => {
            let base = match mode {
                Mode::Live => 0.002,
                Mode::Priority => 0.0012,
                Mode::Standard => 0.0006,
            };
            let depth_mult = if *depth <= 10 { 1.0 } else { (*depth as f64 / 10.0).ceil() };
            let param_mult = 5.0_f64.powi(*extra_params as i32);
            (*count as f64) * base * depth_mult * param_mult
        }
    }
}
```

Tests in `domain/cost.rs`: Property-Tests via `proptest`-Crate, plus harte Beispiele aus dem DataForSEO-Pricing-Page.

### TypeScript-Mirror

```ts
// src/lib/cost.ts
import type { CostAction, Mode } from "./types";

export function estimate(action: CostAction): number { /* ... gleiche Logik ... */ }
```

Mirror existiert nur für UX (debounced Live-Vorschau ohne Tauri-Round-Trip). Server-Estimate (Rust) ist Source-of-Truth bei Diskrepanz: vor Bestätigung des Run-Buttons werden beide verglichen, ungleiche Werte loggen einen Warning + verwenden Rust-Wert.

---

## Teil 6: Rate-Limiter

DataForSEO limitiert pro Endpoint-Familie unterschiedlich (Mapping-Doc Teil 5). In Tier 1 relevant:

| Family | Limit |
|---|---|
| Google Ads Live | 12 req / Min / Account |
| Labs | hoch (kein praktisches Limit in Tier 1) |
| SERP Live | hoch |
| SERP task_post | 2000 req / Min, max 30 simultan |

### Token-Bucket-Scheduler

```rust
pub struct Scheduler {
    buckets: HashMap<Family, Mutex<TokenBucket>>,
}

pub enum Family { GoogleAdsLive, Labs, SerpLive, SerpTask }

impl Scheduler {
    pub async fn acquire(&self, family: Family) -> Permit {
        // refill rate aus domain::rate::policy(family)
        // .await wenn Bucket leer -> sleep bis Refill
    }
}
```

Wiring: `api::client::send` ruft `scheduler.acquire(family).await` als ersten Schritt. Permit wird dropped, wenn die Funktion zurückkehrt. Keine explizite Rückgabe — RAII.

Concurrency-Limits (z. B. 30 simultan für Backlinks später) werden über `tokio::Semaphore` zusätzlich realisiert.

---

## Teil 7: SERP-Task-Pipeline (Standard-Queue)

Die einzige asynchrone Komponente in Tier 1. Wichtig als Lehrstück, weil On-Page (Tier 3) dasselbe Muster braucht.

### Sequenz

```
User klickt "Bulk SERP starten"  (UI)
   │
   ├─► tauri.invoke("serp_task_create", { keywords, ... })
   │
   ▼
commands::serp::serp_task_create
   ├─► validate keywords
   ├─► batch nach 100 Keywords/Request
   ├─► for batch in batches:
   │     POST /v3/serp/google/organic/task_post
   │     parse response.tasks[].id
   │     INSERT INTO serp_tasks (status='pending', batch_id, ...)
   ├─► INSERT INTO api_calls (cost, ...)
   └─► return TaskBatchId

UI navigiert auf Tasks-Page, zeigt Progress-Indikator.

Background-Worker (Tokio-Task seit App-Start):
   loop {
       sleep 30s
       SELECT FROM serp_tasks WHERE status='pending'
       if empty -> continue
       GET /v3/serp/google/organic/tasks_ready
       for each ready_id in response:
           UPDATE serp_tasks SET status='ready' WHERE task_id=ready_id
       SELECT FROM serp_tasks WHERE status='ready'
       for task in those:
           GET /v3/serp/google/organic/task_get/regular/{task_id}
           INSERT INTO serp_results (...)
           UPDATE serp_tasks SET status='fetched', fetched_at=now()
           emit("task_progress", { batch_id, task_id, status: "fetched" })
   }
```

### Failure-Modes

| Szenario | Verhalten |
|---|---|
| `task_post` antwortet mit Fehler | api_calls bekommt `error`, batch-create returned `Err`, UI-Toast |
| Task in `tasks_ready` taucht > 24 h nicht auf | nach 48 Polls (= 24 h bei 30 s) status='failed', User kann manuell retriggern |
| `task_get` 404 | Retry max. 3x, dann status='failed' |
| App-Crash mit pending Tasks | Beim Restart: Worker liest pending/ready Rows weiter, nichts geht verloren |

### Shutdown-Verhalten

Im Tauri-`on_window_event(close_requested)`:
1. Signal an Worker via `CancellationToken`.
2. Worker beendet aktuellen Iteration-Schritt sauber, persistiert Status.
3. Tauri schliesst dann das Fenster.

---

## Teil 8: Auth & Secrets

### Speicherung

`secrets/keychain.rs` kapselt das `keyring`-Crate (gleiche API auf macOS/Windows/Linux).

```rust
const SERVICE: &str = "dataforseo-app";

pub fn save(login: &str, password: &str) -> Result<()> {
    keyring::Entry::new(SERVICE, "login")?.set_password(login)?;
    keyring::Entry::new(SERVICE, "password")?.set_password(password)?;
    Ok(())
}

pub fn load() -> Result<Option<Credentials>> { /* analog */ }
```

### Lebenszyklus

1. App-Start: `secrets::load()` einmal. Credentials in `Arc<RwLock<Option<Credentials>>>` in `AppState`.
2. `api::Client` liest beim Build aus dem RwLock, baut Basic-Auth-Header.
3. Wenn `save_credentials` aufgerufen wird: Schreibt Keychain + aktualisiert RwLock + invalidiert HTTP-Client (force rebuild).
4. **Webview erhält die Credentials nie** — kein `tauri.invoke("get_credentials")`-Command existiert. Nur `test_connection` zeigt indirekt, dass sie funktionieren.

### Test-Connection

```rust
#[tauri::command]
async fn test_connection(state: State<'_, AppState>) -> Result<UserInfo, AppError> {
    let creds = state.credentials().ok_or(AppError::Auth("not set".into()))?;
    let resp = state.api.user_data().await?;
    Ok(UserInfo { login: resp.user.login, balance: resp.user.money.balance })
}
```

`/v3/appendix/user_data` ist kostenlos — perfekt für Connectivity-Check.

---

## Teil 9: Error-Handling

### Rust-Seite

```rust
#[derive(Serialize, TS, thiserror::Error, Debug)]
#[ts(export)]
pub enum AppError {
    #[error("network error: {0}")]
    Network(String),
    #[error("authentication failed: {0}")]
    Auth(String),
    #[error("rate limit exceeded for {family}, retry in {retry_after_secs}s")]
    RateLimit { family: String, retry_after_secs: u32 },
    #[error("validation: {0}")]
    Validation(String),
    #[error("database: {0}")]
    Database(String),
    #[error("api: {status_code} - {message}")]
    Api { status_code: u32, message: String },
    #[error("internal: {0}")]
    Internal(String),
}
```

`From`-Conversions von `reqwest::Error`, `duckdb::Error`, `keyring::Error` etc. zu `AppError`.

### React-Seite

```ts
// src/lib/errors.ts
export function errorToToast(err: AppError): string {
    switch (err.kind) {
        case "RateLimit":   return `Zu viele Anfragen. Bitte ${err.retry_after_secs}s warten.`;
        case "Auth":        return "Login ungültig. Bitte Credentials in Settings prüfen.";
        case "Network":     return "Keine Verbindung zur DataForSEO API.";
        case "Validation":  return err.message;
        // ...
    }
}
```

Jeder Tauri-`invoke()`-Call ist in `tauri.ts` so verpackt:

```ts
export async function keywordsSearchVolume(args: KeywordsSearchVolumeArgs): Promise<KeywordVolumeBatch> {
    try { return await invoke("keywords_search_volume", args); }
    catch (e) { throw new AppErrorWrapper(e as AppError); }
}
```

Routes / Components rendern Toasts via `react-hot-toast`.

---

## Teil 10: UI-Patterns (Tier-1-Mapping)

| Endpoint | Route | Key-Komponenten | Notable |
|---|---|---|---|
| `keywords_search_volume` | `/keywords/volume` | BulkKeywordInput, CostPreview, ResultsTable, ChartCard | Cache-Hint im Result ("X von Y aus Cache") |
| `keywords_suggestions`   | `/keywords/discover` | Single seed input, ResultsTable | "+Volume"-Quickaction → ergänzt Volumen via search_volume |
| `keywords_related`       | `/keywords/related` | Seed input, depth-Slider (1–4), ResultsTable | Cost steigt linear mit depth → klare Anzeige |
| `keywords_for_domain`    | `/domain/:domain` | URL-Input, Summary-Tiles, ResultsTable | Top-1000-Limit explizit kommunizieren |
| `serp_live`              | `/serp/quick` | Single keyword, LocationPicker, depth-Toggle | Direkter Link zu jeder URL |
| `serp_task_create`       | `/serp/bulk`  | BulkKeywordInput, "Run as task"-Button | Anschliessend Tasks-Tab markiert |
| (alle Tasks)             | `/tasks` | StatusBadge, Progress-Bar pro Batch | Filter: pending/ready/fetched/failed |
| (Cost-Ledger)            | `/usage` | Bar-Chart Endpoint × Spend, Tabelle Recent Calls | Default 30 Tage Range |

### Default-Werte

- Mode: **Standard** (3,3× günstiger als Live, siehe Mapping Teil 7).
- Location: aus `settings.default_location_code`, initial `2276` (Deutschland).
- Language: `settings.default_language_code`, initial `de`.
- Depth (SERP): 10.

Live-Modus ist erreichbar via `ModeToggle`, aber nie Default — bewusste Opt-in-Entscheidung pro User-Action.

---

## Teil 11: Logging / Telemetry / Dev-Experience

### Logging

`tracing` + `tracing-subscriber` mit zwei Sinks:
- Stdout (Dev-Mode) — Pretty-Format, ANSI.
- Datei `~/.local/share/dataforseo-app/logs/app.log` mit Rotation (10 MB × 5).

Spans um jedes Command:

```rust
#[tauri::command]
#[instrument(skip(state))]
async fn keywords_search_volume(...) { ... }
```

→ Kostenfrei strukturierte Logs für jeden User-Action.

### Telemetry

Kein automatisches Telemetry in MVP. `telemetry/`-Modul hat `Stub`-Implementation, die beim späteren SaaS durch Sentry-Integration ersetzt wird.

### Dev-Workflow

- **Backend-Watch:** `cargo tauri dev` (built-in Hot-Reload).
- **Frontend-HMR:** Vite läuft parallel.
- **DB-Inspektion:** `duckdb $APP_DATA/db.duckdb` im Terminal.
- **Mock-Mode:** ENV `DATAFORSEO_MOCK=1` setzt `api::client` auf einen Mock-Adapter mit fixen Responses → kein API-Spend bei UI-Iteration.

---

## Teil 12: Testing-Strategie

| Test-Art | Scope | Tools | Wann |
|---|---|---|---|
| Domain-Unit-Tests | `domain/cost.rs`, `domain/validation.rs` | `cargo test` + `proptest` | Bei jeder Änderung |
| API-Integration | `api/*.rs` gegen Mock-Server | `wiremock`-Crate | Pro Endpoint, beim Hinzufügen |
| Store-Tests | `store/*.rs` gegen In-Memory-DuckDB | `cargo test` | Bei Schema-Änderungen |
| Command-Smoke | `commands/*.rs` mit gemockten Sub-Layern | `mockall` | Pro neuem Command |
| React-Component | `BulkKeywordInput`, `CostPreview` | `vitest` + `@testing-library/react` | Bei jeder Änderung |
| E2E | Full-stack | (deferred) | Phase 2, sobald Tauri-WebDriver stabil |

CI-Pipeline (GitHub Actions): lint → fmt-check → cargo test → vitest → build (Linux+macOS+Windows). Tier-1-Ziel: < 5 Min komplett.

---

## Teil 13: Architektur-Seams für Tier 2/3

Damit spätere Erweiterungen ohne Re-Write anpassbar sind, werden folgende Stellen bewusst „leer aber vorbereitet" gelassen:

### 1. Filter-DSL (für Backlinks, Labs)

In `domain/filters.rs` wird in Tier 1 ein leerer Modul-Stub angelegt mit dem Typ:

```rust
pub enum Filter {
    Eq(String, Value),
    Ne(String, Value),
    Gt(String, Value),
    // ...
}
pub fn to_dataforseo_array(filters: &[Filter]) -> serde_json::Value;
```

Wenn Tier 2 Backlinks hinzufügt, ist die Serialisierungslogik schon da. UI-`<FilterBuilder>` kann denselben Typ konsumieren.

### 2. Generalisiertes Task-System

`serp_tasks` heisst absichtlich SO und nicht `tasks`, weil Tier 3 (On-Page) eine andere Result-Struktur hat. Beim Übergang zu Tier 3:

- Tabelle `tasks` mit `kind` ('serp' | 'on_page' | 'on_page_lighthouse'), gemeinsame Felder.
- Polymorphe Result-Tabellen pro Kind.
- `tasks/poller.rs` wird Strategy-Pattern: `dyn TaskKindHandler`.

Tier 1 schreibt Code so, dass dieser Refactor lokal bleibt (kein Caller in `commands/` muss angefasst werden).

### 3. SERP-Caching

Wenn Tier 2 lange-laufende Domain-Audits braucht, wird stale-while-revalidate auf `serp_results` möglich — `fetched_at` ist schon vorhanden.

### 4. Webhooks

Tauri-Desktop-App hat keine öffentliche URL → kein Webhook-Empfang in Tier 1. SaaS-Variante (Phase 4) braucht eine Server-Komponente. Architektur-Notiz: `tasks/poller.rs` wird dann durch `tasks/webhook_receiver.rs` substituiert; Datenmodell unverändert.

### 5. Multi-Account

Schema partitioniert NICHT nach `account_id` in Tier 1 (Single-User-App). Bei SaaS: Migration v00XX fügt `account_id` zu allen Tabellen, alle Queries werden nach `account_id` gefiltert. Ein bisschen Pain, aber kein Komplett-Rewrite.

---

## Teil 14: Implementation-Milestones

Vom leeren Repo zum verkaufbaren Tier-1-MVP:

| # | Milestone | Aufwand |
|---|---|---|
| 1 | **Bootstrap**: `cargo tauri init`, Vite/TS/Tailwind, Folder-Skelett, CI-Pipeline grün | 2 h |
| 2 | **Auth-Flow**: keychain wrapper, SettingsPage, test_connection, AppState | 3 h |
| 3 | **API-Client + Cost-Estimator**: client.rs, cost.rs (Rust + TS-Mirror), Property-Tests | 3 h |
| 4 | **Volume-Page (E2E)**: BulkKeywordInput → search_volume → ResultsTable → ChartCard → ledger insert | 4 h |
| 5 | **Labs-Endpoints**: 3 Commands + 3 Tabs (Suggestions, Related, Domain) | 4 h |
| 6 | **SERP Live**: Quick-Check-Page | 2 h |
| 7 | **SERP Task-Pipeline**: Schema, poller, Tasks-Page, Events | 5 h |
| 8 | **Cache-Layer**: keyword_volume_cache + UI-Hint | 1 h |
| 9 | **Usage-Page**: Cost-Ledger-Dashboard mit Chart | 2 h |
| 10 | **Polish**: Toasts, Loading-States, Empty-States, Mock-Mode | 3 h |

**Summe:** ~29 h. Zwei lange Wochenenden oder vier intensive Abende.

---

## Teil 15: Was als Nächstes ansteht

Mit diesem Architektur-Dokument als Fundament:

→ **Tauri-Skelett** (Milestone 1 oben): Repo anlegen, Bootstrap-Commit, CI-Pipeline. Eigenes Repo (NICHT in `xrey167/.github`), z. B. `xrey167/dataforseo-app`.

→ **Tier-1-Implementation** entlang der Milestones 2–10.

→ **Phase-2-Pre-Work**: parallel zur Tier-1-Polish-Phase ein zweites Mapping-Dokument für Backlinks (mit visuellem Filter-Builder-Mockup) vorbereiten.
