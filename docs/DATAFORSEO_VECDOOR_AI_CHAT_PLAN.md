# DataForSEO App: vecdoor LinkedIn-Post Mapping + AI-Chat-Plan

**Projektkontext:** Antwort auf den vecdoor.com LinkedIn-Post (Mai 2026), der
das Produkt beschreibt: lokales UI für DataForSEO mit AI-Chat. Mappt jede
Aussage des Posts gegen den aktuellen App-Stand und plant die fehlenden
Features.

**Stand:** Mai 2026.
**Vorbedingungen:** Tier 1 (PR-Stack #15-#24) ist gebaut. SEMrush-Parität-
Plan steht (PR #25).

---

## Teil 0: Mapping der Post-Aussagen gegen den App-Stand

Der Post beschreibt sechs konkrete Features. Stand der Implementierung:

| Post-Aussage | App-Status | Wo |
|---|---|---|
| „Lokal auf PC/Mac läuft (wie Screaming Frog)" | ✅ gebaut | PR #15 (Tauri 2 Skelett, Win + macOS + Linux) |
| „DataForSEO Key eingeben" | ✅ gebaut | PR #15 (`SettingsPage`, OS-Keychain) |
| „Über Formulare die Endpunkte abfragen" | ✅ gebaut | PRs #18 (Volume), #19 (Suggestions/Related), #20 (Domain), #21 (SERP Live), #22 (SERP Bulk) |
| „Bequem in einer Tabelle filtern" | ⚠️ teilweise | tanstack-table mit Sortierung in jedem Tab; **echter Filter-Builder** kommt mit Backlinks Phase 2 (PR #17) |
| „Vergleichen" | ❌ Lücke | siehe Teil 2 |
| „Exportieren" (CSV/Excel) | ❌ Lücke | siehe Teil 3 |
| „SEO Daten für einen Bruchteil von ahrefs/SEMrush" | ✅ Pricing-Modell steht | PR #25 (Pro 29 USD/Monat vs SEMrush 130-450 USD/Monat) |
| „AI Chat — Cluster mir meine Keywords / Welche Blogposts soll ich erstellen?" | ❌ Lücke | siehe Teil 4 |

→ **Drei konkrete Lücken: Vergleich, Export, AI-Chat.** Dieses Dokument
plant alle drei, mit Fokus auf den AI-Chat (das eigentliche
Differenzierungs-Feature).

---

## Teil 1: Sortierung & Filterung — was schon da ist

`apps/dataforseo-app/src/components/ResultsTable.tsx` nutzt
`@tanstack/react-table` mit:

- Click-Sortierung pro Spalte (asc/desc)
- Empty-State
- Virtualisierung kommt mit der Backlinks-Phase 2

Was fehlt für „echtes" SEMrush-Niveau:

- Volltext-Suche im Tabellenkopf (1-2 h Aufwand)
- Spalten-Filter (z. B. „nur Volume > 1000")
- Spalten-Auswahl (User wählt sichtbare Spalten)
- Persistierter Tabellen-Zustand pro Route

Das ist Polish, nicht Lücke. Phase Tier 4 / Polish.

---

## Teil 2: Vergleich („Compare")-Feature

### Use cases aus dem Post

- „Vergleiche meine Domain mit der eines Konkurrenten"
- „Vergleiche zwei Keyword-Sets" (Verschnitt, Differenz)

### Architektur

Zwei separate Vergleichs-Modi:

#### A) Domain-Vergleich (Side-by-Side Domain Overview)

UI: zwei oder drei Domain-Eingabefelder, Submit lädt für jede Domain
parallel ranked_keywords + domain_rank_overview (siehe SEMrush-Plan
Teil 2.A) + summary aus den DataForSEO Labs Domain-Endpunkten. Tabellen
nebeneinander; Schwerpunkt: gemeinsame Keywords (Schnitt) + exklusive
Keywords pro Domain.

```
┌────────────────┬────────────────┬────────────────┐
│  meine-domain  │  konkurrent-1  │  konkurrent-2  │
├────────────────┼────────────────┼────────────────┤
│ Visibility 145 │ Visibility 312 │ Visibility 89  │
│ Keywords 1.2k  │ Keywords 8.7k  │ Keywords 540   │
│ ETV $4,200/mo  │ ETV $28k/mo    │ ETV $1,800/mo  │
└────────────────┴────────────────┴────────────────┘

Shared Keywords (Schnitt): 320
Only meine-domain: 880
Only konkurrent-1: 7,500    ← Keyword-Gap, klick zum Drill-down
```

DataForSEO-Endpunkt-Hilfe: `dataforseo_labs/google/domain_intersection/live`
liefert die Schnittmenge direkt. Eigenleistung minimal (UI + Aggregation).

**Aufwand:** ~1.5 Wochenenden.

#### B) Keyword-Set-Vergleich

UI: zwei BulkKeywordInput-Felder. Submit zeigt: Schnittmenge, Differenzen,
Volumen-Distribution pro Set, optional CPC-Vergleich.

Reine App-Logik, keine zusätzlichen API-Calls (nutzt bestehende
search_volume).

**Aufwand:** ~1 Wochenende.

---

## Teil 3: Export („CSV/Excel/Sheets")

### Formate

| Format | Use case | Aufwand |
|---|---|---|
| CSV | Klassisch, jede Tabelle | trivial |
| XLSX | Excel-Power-User, mit Formatierung | mittel |
| Google Sheets Direkt-Export | „Push to Sheets" Button | mittel (OAuth) |
| JSON | Power-User / Re-import | trivial |

### Architektur

Frontend-only — alle Daten liegen schon im React-State.

```typescript
// src/lib/export.ts
export function downloadCsv<T>(rows: T[], columns: ColumnDef<T>[], filename: string) {
  const header = columns
    .map(c => csvEscape(typeof c.header === "string" ? c.header : String(c.id)))
    .join(",");
  const body = rows.map((r, i) =>
    columns.map(c => csvEscape(String(c.accessorFn?.(r, i) ?? ""))).join(","),
  ).join("\n");
  triggerBlobDownload(`${header}\n${body}`, filename, "text/csv");
}
```

Universelles Export-Menü (Drei-Punkte-Button) auf jedem ResultsTable
mit "Download CSV", "Download JSON". XLSX/Sheets in Phase 5.

**Aufwand:** 4-6 h für CSV+JSON, ergänzt jede bestehende ResultsTable.

---

## Teil 4: AI-Chat-Modul (Headline-Feature)

Der eigentliche Verkaufs-Hook des Posts. Plan im Detail.

### 4.1 Use cases (aus dem Post + sinnvolle Erweiterungen)

1. **„Clustere mir meine Keywords"** — User hat 500 Keywords aus
   suggestions/volume in der Tabelle, möchte sie thematisch gruppiert sehen.
2. **„Welche Blogposts sollte ich erstellen?"** — User hat ranked_keywords
   einer Domain, möchte Content-Ideen ableiten.
3. **„Welche Keywords haben kommerzielle Intention?"** — User hat eine
   Keyword-Liste, möchte Intent-Klassifikation (informational, navigational,
   commercial, transactional).
4. **„Was sind die Top 3 Konkurrenten dieser Domain?"** — User schaut SERP-
   Resultate, möchte qualitative Bewertung.
5. **„Schreibe mir ein Title + Meta-Description für dieses Keyword"** — User
   sieht ein Top-Keyword in der Liste, möchte Snippet-Vorschlag.

### 4.2 LLM-Provider-Wahl

| Provider | Pro | Contra |
|---|---|---|
| Anthropic Claude (Sonnet 4.6) | Beste Reasoning-Qualität für strukturierte SEO-Analysen, gutes deutsches Vokabular | Cost: ~3 USD / 1M input tokens |
| OpenAI GPT-4o-mini | Sehr günstig (~0.15 USD / 1M), schnell | Schwächer bei deutschen SEO-Begriffen, weniger gutes Tool-Use |
| Lokales LLM via Ollama | Null Cost, Privacy, Offline | Setup-Aufwand für User; Qualität schwankt; Latenz bei großen Listen |
| Google Gemini Flash | Günstig, multimodal | Quoten-Politik unklar |

**Empfehlung:** **Claude Sonnet 4.6 als Default**, **GPT-4o-mini als
Sparmodus**, **Ollama als Pro-Feature** für Datenschutz-sensible Kunden.
User wählt im Settings-Dialog. App speichert Provider-Keys analog zum
DataForSEO-Key (OS-Keychain).

### 4.3 Architektur

#### Backend

```
src-tauri/src/
├── ai/
│   ├── mod.rs               # AiClient trait
│   ├── anthropic.rs         # Claude-Implementierung
│   ├── openai.rs            # OpenAI-Implementierung
│   ├── ollama.rs            # Ollama-Implementierung
│   └── prompts.rs           # Prompt-Templates pro Use case
├── secrets/
│   └── keychain.rs          # erweitert um anthropic.api_key etc.
├── store/
│   └── chat.rs              # neu: chat_sessions + chat_messages
└── commands/
    └── ai.rs                # chat_send, chat_history, chat_new_session
```

```rust
#[async_trait]
pub trait AiClient: Send + Sync {
    async fn chat(&self, messages: &[ChatMessage]) -> Result<ChatResponse>;
}

pub struct ChatMessage {
    pub role: Role,                 // System | User | Assistant
    pub content: String,
}

pub struct ChatResponse {
    pub content: String,
    pub usage: TokenUsage,          // input + output tokens, cost in USD
}
```

`AiClient` wird hinter `Arc<dyn AiClient>` in `AppState` gehalten,
auswählbar zur Laufzeit (Provider-Switch ohne Restart).

#### Frontend

```
src/routes/
└── ChatPage.tsx              # neue Top-Level-Route /chat
src/routes/chat/
├── ChatThread.tsx            # Message-Liste mit Markdown-Render
├── ChatInput.tsx             # Multi-Line-Input mit Submit + Cmd+Enter
├── DataAttachment.tsx        # zeigt aktuell „angehängte" Tabelle als Pill
└── QuickActions.tsx          # Vorgefertigte Prompts (Cluster, Intent, …)
```

#### Daten-Anhängung („mit Ergebnis chatten")

Der entscheidende UX-Trick: User klickt in einer ResultsTable auf
„Mit AI besprechen". Die Tabelle wird als JSON-Anhang an die Chat-
Session übergeben. Implementierung:

1. Jede ResultsTable bekommt einen „💬 Chat"-Button.
2. Klick → Tabelle als JSON-String → Tauri-Command `chat_attach_data`.
3. ChatPage öffnet sich mit Anhang oben sichtbar (Pill „1.000 keywords
   attached") + leerem Input.
4. User schreibt Prompt; Backend baut Context aus Anhang + Prompt-Template.

#### Context-Strategie

Naive: kompletter JSON-Dump der Tabelle in den System-Prompt. Bricht bei
> ~5k Zeilen (Token-Limit).

Besser: drei-stufiges Sampling:

1. **Klein (≤ 100 Zeilen):** vollständig in Context.
2. **Mittel (≤ 1.000 Zeilen):** Top-50 nach search_volume + Statistiken
   (Min/Max/Median pro Spalte) + ein Sample der Long-Tail (10 zufällige
   Zeilen).
3. **Groß (> 1.000 Zeilen):** automatisches Cluster-Pre-Processing in der App
   (siehe Teil 4.4a), nur die Cluster-Zentroide gehen in den Context.

### 4.4a Cluster-Pre-Processing für große Anhänge

Für > 1.000-Zeilen-Anhänge wird **lokal in der App** geclustert (kein
LLM-Roundtrip), bevor der Context für den eigentlichen Chat gebaut wird.
Pragmatischer Algorithmus, kein ML-Framework nötig:

1. **Tokenisieren:** jedes Keyword in lowercase, Stopwörter entfernen,
   Stemming (z. B. `rust-stemmers`-Crate), in Set von Token-Stems überführen.
2. **Ähnlichkeit:** Jaccard-Distanz auf den Token-Sets pro Paar.
3. **Clustering:** Hierarchisches Single-Linkage mit Cutoff bei
   Ähnlichkeit ≥ 0.4. Implementierung in `src-tauri/src/ai/cluster.rs`,
   ~150 Zeilen ohne Abhängigkeiten ausser `rust-stemmers`.
4. **Cluster-Repräsentation:** Pro Cluster: Cluster-Name (häufigster
   gemeinsamer Token-Stem), Anzahl Mitglieder, Top-3-Keywords nach
   `search_volume`, Summe `search_volume`.
5. **Resultat in Context:** statt 10.000 Keyword-Zeilen gehen 50–200
   Cluster-Beschreibungen in den LLM-Prompt.

Erweiterte Variante (Phase 2) mit lokalen Embeddings über das
`ort`-Crate + ONNX (z. B. multilingual MiniLM): höhere semantische Qualität,
~30 MB Modell-Download, optional aktivierbar in Settings.

### 4.4 Prompt-Templates

In `src-tauri/src/ai/prompts.rs` als typisierte Konstanten:

```rust
pub const CLUSTER_KEYWORDS: &str = r#"
Du bist ein SEO-Experte. Cluster die folgenden Keywords nach
thematischer Verwandtschaft. Gib für jeden Cluster:
- einen prägnanten Cluster-Namen (max 4 Wörter)
- die Keywords im Cluster
- die geschätzte Suchintention (informational | commercial | …)
- einen kurzen Content-Vorschlag (1 Satz)

Antwort als JSON-Array.

Keywords:
{KEYWORDS_JSON}
"#;

pub const BLOG_IDEAS: &str = r#"
Basierend auf folgenden Keywords (sortiert nach Volumen + Intention),
schlage 5-10 Blogpost-Themen vor. Pro Idee:
- Titel (SEO-optimiert, ≤ 60 Zeichen)
- Hauptkeyword
- Sekundär-Keywords (2-4 aus der Liste)
- Geschätztes Schwierigkeits-Niveau (1-5)
- 2 Sätze: warum dieser Post Sinn macht.

Daten:
{KEYWORDS_JSON}
"#;
```

Prompt-Templates werden via `{KEYWORDS_JSON}`-Tokens gefüllt. Versionierung
in der DB (chat_messages.prompt_template_id) damit User-Feedback an Templates
hängbar ist.

### 4.5 Cost-Modell für AI-Chat

Wie bei DataForSEO: jeder Call wird ins ledger geschrieben (eigene Tabelle
`ai_calls` parallel zu `api_calls`). Ledger-UI auf der Usage-Page bekommt
einen zweiten Tab „AI Calls".

Beispiel-Pricing für 100 Cluster-Operationen pro Monat:
- Claude Sonnet 4.6: ~10k input tokens × 100 = 1M tokens × 3 USD/M = 3 USD
- + Output: ~2k tokens × 100 = 200k × 15 USD/M = 3 USD
- = **~6 USD/Monat** für aktive AI-Nutzung

Pricing-Hinweis im UI vor jedem Chat-Send: „Geschätzte Kosten: $0.04".
Gleiche UX wie der Cost-Estimator vor DataForSEO-Calls.

### 4.6 Datenmodell

Hinweis: Die App nutzt **DuckDB**, nicht SQLite (siehe
`apps/dataforseo-app/src-tauri/Cargo.toml`). Das Schema verwendet bewusst
DuckDB-Syntax (`BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
`VARCHAR`, `JSON`, `DOUBLE`). Konsistent mit den bestehenden
Tier-1-Migrationen (`migrations/v0001_initial.sql`).

```sql
CREATE TABLE chat_sessions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title VARCHAR,                                 -- AI-generiert nach erster Nachricht
    provider VARCHAR NOT NULL,                     -- 'anthropic' | 'openai' | 'ollama'
    model VARCHAR NOT NULL,                        -- 'claude-sonnet-4-6'
    attachment_json JSON,                          -- ursprüngliche Tabellen-Daten
    attachment_summary VARCHAR,                    -- "1000 keywords from /keywords/volume"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    session_id BIGINT NOT NULL,
    role VARCHAR NOT NULL,                         -- 'system' | 'user' | 'assistant'
    content VARCHAR NOT NULL,
    prompt_template_id VARCHAR,                    -- 'cluster' | 'blog_ideas' | NULL für freien Chat
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX chat_messages_session_idx ON chat_messages(session_id);

CREATE TABLE ai_calls (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    provider VARCHAR NOT NULL,
    model VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,                      -- 'chat' | 'cluster' | 'titles'
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd DOUBLE NOT NULL,
    duration_ms INTEGER,
    error VARCHAR
);
```

### 4.7 Sicherheits-Überlegungen

- API-Keys (Anthropic, OpenAI) im OS-Keychain, **nie** in der Webview.
- Prompt-Injection: User-Daten (Keyword-JSON) wird in eigenes XML-Tag
  gewrappt: `<user_data>...</user_data>` → System-Prompt-Anweisungen sind
  immun gegen Inhalts-Injektion.
- Rate-Limiting: Anthropic hat eigene Quoten; App fängt 429 mit Retry-
  Backoff ab.
- Kein Streaming der Daten an Drittanbieter, wenn User „Local Only"
  (Ollama) gewählt hat.

### 4.8 UI-Skizze

```
┌──────────────────────────────────────────────────────┐
│ DataForSEO  |  Keywords  Domain  SERP  Tasks  Chat 💬│
├──────────────────────────────────────────────────────┤
│                                                      │
│  📎 1.000 keywords attached (from /keywords/volume) │
│                                                      │
│  Quick actions:                                      │
│  [Cluster] [Blog Ideas] [Intent] [Titles] [Export]  │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ User: Clustere die Keywords nach Suchintention │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Assistant: Ich habe 4 Cluster gefunden:        │ │
│  │ 1. **Informational** (340 Keywords): ...       │ │
│  │ 2. **Commercial** (210 Keywords): ...          │ │
│  │ ...                                            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │ Was soll ich noch wissen wollen?          │       │
│  └──────────────────────────────────────────┘       │
│                            Geschätzt: $0.03 [Send]  │
└──────────────────────────────────────────────────────┘
```

---

## Teil 5: Reihenfolge der Patches

Vorgeschlagene Sequenz (jeder Schritt ist ein eigener PR):

1. **Export (CSV/JSON)** — schnellster Win, ~1 PR-Tag, kein neuer Provider.
2. **Keyword-Set-Vergleich** — eigene Route /compare/keywords, ~2 PR-Tage,
   keine neuen Endpunkte.
3. **Domain-Vergleich Side-by-Side** — wartet auf SEMrush-Tier-2-Endpunkte
   (domain_rank_overview, competitors_domain), siehe SEMrush-Plan Teil 5.
4. **AI-Chat MVP** — Schema + Anthropic-Provider + ChatPage mit Cluster-
   und BlogIdeas-Templates. ~1 Woche.
5. **AI-Chat Erweiterungen** — OpenAI-Provider, Ollama-Provider, weitere
   Templates (Intent, Titles, Konkurrenten-Bewertung). Inkrementell.
6. **AI-Cost-Ledger UI** — Tab auf Usage-Page. ~0.5 PR-Tage.

**Empfehlung Reihenfolge:** 1 → 4 → 2 → 6 → 3 → 5. AI-Chat zuerst nach Export,
weil das der eigentliche Differenzierer ist.

---

## Teil 6: Was nicht in MVP gehört

Aus Disziplin-Gründen explizit NICHT im ersten AI-Chat-PR:

- Multi-Modal-Inputs (Screenshots in den Chat ziehen).
- Function-Calling / Tool-Use (Agent ruft selbst DataForSEO).
- Voice-Input.
- Sharing/Export von Chat-Sessions.
- Mehrere parallele Chat-Threads pro Tabelle.

Alle obigen sind reasonable in Phase 2, aber tragen nicht zum „Cluster mir
meine Keywords"-Use-Case bei.

---

## Teil 7: Was als Nächstes konkret zu tun ist

1. Diesen Plan reviewen und approven.
2. Export-PR (~1 Tag).
3. AI-Chat-MVP-PR (~1 Woche): Backend-Struktur, ChatPage, Anthropic-Adapter,
   Cluster + BlogIdeas Templates, Cost-Tracking.
4. Beta-Testing mit den im LinkedIn-Post angefragten Tester:innen — Feedback
   speist Templates und UX-Polish.
