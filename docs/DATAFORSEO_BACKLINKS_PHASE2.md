# DataForSEO Backlinks API: Phase 2 Mapping & Filter-Builder Design

**Projektkontext:** Anschluss-Dokument an `DATAFORSEO_API_MAPPING.md` (Tier-Übersicht)
und `DATAFORSEO_ARCHITECTURE.md` (Tier-1-Implementierung). Konkretisiert die
Backlinks-API-Familie für die Phase 2 der Tauri-App.

**Stand:** Mai 2026.
**Vorbedingungen:** Tier 1 (Keywords + SERP) ist implementiert und stabil. App
hat bereits Cost-Estimator, OS-Keychain-Auth, DuckDB-Cache, Rate-Limiter.

---

## Teil 0: Warum eigenes Dokument

Die Backlinks-API hat drei Eigenschaften, die sie strukturell von Tier 1
unterscheiden — jede einzelne erzwingt Architektur-Entscheidungen, die zu
gross sind für einen knappen Mapping-Eintrag:

1. **100 USD/Monat-Commitment.** Ändert die Pricing-Strategie der App.
2. **`filters[]`-DSL.** Erzwingt einen visuellen Filter-Builder als Kern-UI.
3. **Eigene Rate-Limit-Klasse.** 2000 req/min, max 30 simultan. Anderes
   Token-Bucket-Tuning als bei Tier 1.

Plus: Backlinks ist die teuerste API-Familie pro Datenpunkt
($0,02 Basis + $0,00003 pro Zeile), also der wichtigste Kandidat für
aggressives lokales Caching.

---

## Teil 1: Pricing & Commitment

### Hard fact: 100 USD-Monatsmindestumsatz

Die Backlinks-API hat ein monatliches Mindest-Commitment von 100 USD.
Das Commitment kann für **jede** DataForSEO-API ausgegeben werden (also auch
für die Tier-1-Endpunkte), aber **es muss aus dem Konto verbraucht werden**.

**Ausnahme:** Das Commitment entfällt, wenn die Backlinks-API über Make.com,
n8n oder den offiziellen Google-Sheets-Connector genutzt wird. Für eine
Tauri-Desktop-App, die direkt gegen die HTTP-API geht, gilt das Commitment.

### Konsequenz für die App-Pricing-Strategie

Der User braucht entweder:

- **Option A:** Ein DataForSEO-Konto mit ≥ 100 USD/Monat Verbrauch über alle
  APIs zusammen. Realistisch für jede SEO-Agentur, die das Tool ernsthaft
  nutzt.
- **Option B:** Wir bauen Backlinks **nicht** direkt ein, sondern bieten
  einen Make.com-/n8n-Workflow-Export an, der die Daten über das
  commitment-freie Drittsystem holt und in die App importiert. Komplexer,
  aber für Solo-User ohne 100-USD-Budget sinnvoll.
- **Option C:** Reseller-Modell. Wir betreiben einen Backlinks-Proxy als
  SaaS-Komponente, übernehmen das Commitment, rechnen pro App-User ab.
  Erfordert Server-Komponente und ändert das App-Geschäftsmodell.

**Empfehlung Phase 2:** Option A. Im UI ein klarer Hinweis im Backlinks-Modul:

> „Dieses Modul erfordert ein DataForSEO-Konto mit aktivierter Backlinks-API
> (100 USD Mindestumsatz pro Monat). Test in den Settings möglich."

Option B (Make.com-Workflow-Export) kann in Phase 3 evaluiert werden,
abhängig vom Bedarf der ersten 10 User.

### Pricing pro Endpoint

| Komponente | Kosten |
|---|---|
| Pro API-Request | 0,02 USD |
| Pro abgerufener Datenzeile | 0,00003 USD |
| Maximum Zeilen pro Request | 1000 |
| Beispiel: 1 Request mit 1000 Zeilen | 0,02 + 1000 × 0,00003 = 0,05 USD |
| Beispiel: 50 Requests à 1000 Zeilen | 50 × 0,05 = 2,50 USD |

**Wichtig:** Bei Aggregat-Endpoints (`summary`, `history`) wird typischerweise
nur 1–24 Zeilen zurückgegeben. Diese sind also „cheap" (~0,02 USD pro Call).
Detail-Endpoints (`backlinks`, `referring_domains`) können bei vollem Profil
hunderte Requests à 1000 Zeilen kosten.

### Update am Cost-Estimator

```rust
pub enum CostAction {
    // ...vorhandene Tier-1-Varianten...
    BacklinksSummary { target_count: u32 },                         // Pauschal pro Target
    BacklinksDetail { target_count: u32, rows_per_target: u32 },    // Skaliert mit Rows
    BacklinksReferringDomains { target_count: u32, rows_per_target: u32 },
    BacklinksAnchors { target_count: u32, rows_per_target: u32 },
    BacklinksHistory { target_count: u32 },                         // Aggregat, billig
    BacklinksDomainIntersection { target_count: u32, rows_per_target: u32 },
}
```

Pure Funktion:

```rust
fn estimate_backlinks_detail(target_count: u32, rows_per_target: u32) -> f64 {
    let requests_per_target = (rows_per_target as f64 / 1000.0).ceil().max(1.0);
    let total_requests = target_count as f64 * requests_per_target;
    total_requests * 0.02 + (target_count * rows_per_target) as f64 * 0.00003
}
```

UI: Cost-Preview muss bei Backlinks **immer** sichtbar sein, nicht nur als
Tooltip — die Kosten sind 50–100x höher als bei Keyword-Volumen.

---

## Teil 2: Endpunkt-Inventar (Detail)

### B1. Backlinks Summary *(MVP-Pflicht — Dashboard-Tile)*

**Endpoint:** `POST /v3/backlinks/summary/live`

**Was:** Aggregat-Metriken für eine Domain in einem Call:
- Total Backlinks, Total Referring Domains
- Verteilung Dofollow/Nofollow
- Verteilung TLDs (.com, .de, .org, ...)
- Anchor-Text-Distribution (Top 10)
- Referring IPs, Subnets

**Use case:** Dashboard-Tile pro Domain. Liefert in einer Anfrage genug Daten
für eine ganze „Backlinks-Übersicht"-Card.

**Cost:** ~0,02 USD pro Call. Sehr günstig — kann liberal aufgerufen werden.

### B2. Backlinks Detail *(MVP-Pflicht — Hauptansicht)*

**Endpoint:** `POST /v3/backlinks/backlinks/live`

**Was:** Liste einzelner Backlinks mit allen Eigenschaften:
- Source-URL, Target-URL, Anchor
- Domain-Rank (DR-Äquivalent), Page-Rank
- First-seen, Last-seen
- Dofollow/Nofollow, Sponsored/UGC
- Link-Type (anchor, image, redirect, ...)

**Filter-Möglichkeiten (das ist der Hauptpunkt):**

```json
"filters": [
  ["dofollow", "=", true],
  "and",
  ["domain_from_rank", ">", 30]
]
```

→ Siehe Teil 3 für die vollständige DSL.

**Cost:** Bei realistischem Profil (1000-100k Backlinks): 0,05–5 USD pro
vollständigem Crawl. **Dies ist der teuerste Endpoint der App.**

### B3. Referring Domains *(MVP-Pflicht)*

**Endpoint:** `POST /v3/backlinks/referring_domains/live`

**Was:** Aggregierte Liste der verlinkenden Domains, eine Zeile pro Domain
mit Domain-Metriken (Rank, Anzahl Links zur Ziel-Domain, IP-Subnet).

**Filter-Möglichkeit:** Selbe DSL wie B2.

**Use case:** Schneller Überblick „Wer verlinkt mich?" ohne den Detail-Lärm
einzelner Backlinks.

### B4. Anchor Text Analysis

**Endpoint:** `POST /v3/backlinks/anchors/live`

**Was:** Anchor-Text-Distribution mit Häufigkeit, Dofollow-Anteil, Domain-
Diversität pro Anchor.

**Use case:** Penalty-/Linkprofil-Audit — verdächtige Anchor-Konzentration
auf Money-Keywords identifizieren.

### B5. Backlinks History

**Endpoint:** `POST /v3/backlinks/history/live`

**Was:** Monatliche Zeitreihe für Backlinks-Anzahl seit 2019.

**Use case:** Trend-Charts. Aggregat, also billig.

### B6. Domain Intersection / Page Intersection *(Verkaufs-Hook)*

**Endpoints:**

- `POST /v3/backlinks/domain_intersection/live`
- `POST /v3/backlinks/page_intersection/live`

**Was:** „Welche Domains/Seiten verlinken auf Konkurrent A, Konkurrent B,
aber nicht auf mich?" — die klassische **Link-Gap-Analyse**.

**Use case:** Differenzierungs-Feature gegenüber günstigen Tools. Klare UX-
Aufgabe: ein Mehr-Domain-Eingabefeld (Mine + Konkurrenten), Resultat-Tabelle
mit „Wer fehlt mir?".

### Phase-2-Auslassungen

Diese Endpoints werden **nicht** in Phase 2 implementiert:

- `bulk_backlinks` (Server-seitige Aggregation für viele Targets gleichzeitig
  — nur sinnvoll für Agentur-Bulk-Workflows in Phase 3).
- `competitors` (Konkurrenz-Identifikation auf Linkprofil-Basis — Mehrwert
  marginal, da SERP Competitors aus Tier 1 bereits dasselbe leistet).
- `bulk_*` Endpoints generell — Bulk ist über die Standard-Queue-Pipeline
  aus Tier 1 elegant nachbaubar.

---

## Teil 3: Die `filters[]`-DSL

Das ist der wichtigste Mechanismus des Backlinks-Moduls. Eine korrekt
implementierte UI dafür ist ein **echtes Verkaufsargument** gegenüber
Konkurrenz-Tools, die nur Free-Text-Suche bieten.

### Grammar (vereinfacht)

```
filter      := condition | composite
condition   := [field, operator, value]
composite   := [filter, logical, filter, ...]
logical     := "and" | "or"
operator    := "=" | "<>" | ">" | "<" | ">=" | "<=" | "in" | "not in" |
               "like" | "not like" | "ilike" | "not ilike" | "match" | "not match"
field       := <endpoint-spezifischer Feldname>
value       := string | number | boolean | array
```

### Beispiele

**Einfach:**
```json
"filters": [["dofollow", "=", true]]
```

**Zusammengesetzt (AND):**
```json
"filters": [
  ["dofollow", "=", true],
  "and",
  ["domain_from_rank", ">", 50]
]
```

**OR mit Gruppierung (verschachtelte Arrays):**
```json
"filters": [
  ["dofollow", "=", true],
  "and",
  [
    ["anchor", "ilike", "%seo%"],
    "or",
    ["anchor", "ilike", "%marketing%"]
  ]
]
```

**`in`-Operator (Mehrwert-Filter):**
```json
"filters": [
  ["tld", "in", ["com", "de", "at", "ch"]]
]
```

### Endpoint-spezifische Felder

Jeder Endpoint hat sein eigenes Feld-Vokabular. Auszug:

| Endpoint | Wichtige Felder |
|---|---|
| `backlinks` | `dofollow`, `domain_from`, `domain_from_rank`, `domain_to_rank`, `anchor`, `first_seen`, `last_seen`, `is_lost`, `link_attribute`, `tld` |
| `referring_domains` | `domain`, `rank`, `backlinks`, `referring_pages`, `first_seen`, `tld`, `is_new`, `is_lost` |
| `anchors` | `anchor`, `referring_domains`, `backlinks`, `dofollow_backlinks` |

→ Der Filter-Builder muss diese Liste pro Endpoint **kennen**. Variante:
hartcodierte Field-Definitionen pro Endpoint im Frontend, generiert aus einer
zentralen JSON-Schema-Datei (`src/lib/backlinks-fields.ts`), die bei einer
Mapping-Änderung von DataForSEO einmalig aktualisiert wird.

---

## Teil 4: Visueller Filter-Builder (UX)

### Mental Model

Eine zweistufige Hierarchie:

1. **Flacher AND-Modus (Default).** Liste von Conditions, alle UND-verknüpft.
   Deckt 80 % der Use cases.
2. **Erweiterter Modus.** Beliebig verschachtelte Gruppen mit AND/OR.
   Optional aktivierbar via „Erweiterter Modus"-Toggle.

Die meisten User wollen nicht „verschachtelte Boole'sche Logik bauen".
Sie wollen „Dofollow + DR > 30 + Anchor enthält 'seo'". Die UI muss diesen
Common Case einfach machen und den Erweiterten Modus als Power-User-Feature
verstecken.

### Komponenten-Skizze

```tsx
<FilterBuilder
  endpoint="backlinks"
  fields={BACKLINKS_FIELDS}
  value={filters}
  onChange={setFilters}
/>
```

```
┌──────────────────────────────────────────────────────────┐
│ Filter (3)                          [+ Filter] [Erw.] │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────┬──────┬──────────────┬───┐            │
│ │ Dofollow        ▼│ =    ▼│ true        ▼│ × │           │
│ ├─────────────────┼──────┼──────────────┼───┤            │
│ │ Domain Rank     ▼│ >    ▼│ 30           │ × │           │
│ ├─────────────────┼──────┼──────────────┼───┤            │
│ │ Anchor          ▼│ ilike▼│ %seo%       │ × │           │
│ └─────────────────┴──────┴──────────────┴───┘            │
└──────────────────────────────────────────────────────────┘
```

**Erweiterter Modus**: dieselben Conditions in nestbaren Gruppen mit
AND/OR-Toggle pro Gruppe. Drag & Drop optional, in Phase-2-MVP nicht nötig.

### Validierung

- Operator-Liste pro Feld-Typ einschränken (boolean → nur `=`/`<>`,
  string → `=`/`<>`/`like`/`ilike`/`in`, number → alle Vergleichs-Operatoren).
- Value-Eingabe je nach Operator (Boolean-Toggle, Multi-Select für `in`,
  Text-Input mit Wildcard-Hint für `like`).
- Live-Vorschau des generierten JSON-Arrays (Dev-Toggle).

### Persistierung

User-gespeicherte Filter:

```sql
CREATE TABLE saved_filters (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    endpoint VARCHAR NOT NULL,                  -- "backlinks", "referring_domains", ...
    filter_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);
```

UI-Element: „Filter speichern als…" + „Gespeicherte Filter"-Dropdown im
Filter-Builder-Header.

---

## Teil 5: Architektur-Deltas vs. Tier 1

### Neuer Rust-Code

```
src-tauri/src/
├── api/
│   └── backlinks.rs          # Neu: 6 Endpoints aus Teil 2
├── domain/
│   ├── filters.rs            # Neu: Filter-Typ + DataForSEO-Serialisierung
│   ├── cost.rs               # Erweitert: Backlinks-Varianten
│   └── rate.rs               # Erweitert: Family::Backlinks (2000 req/min, 30 simultan)
├── store/
│   ├── backlinks_cache.rs    # Neu: stale-while-revalidate auf Summary
│   └── saved_filters.rs      # Neu: CRUD für saved_filters-Tabelle
└── commands/
    └── backlinks.rs          # Neu: 6 Commands, einer pro Endpoint
```

### Schema-Migration

`migrations/v0002_backlinks.sql`:

```sql
CREATE TABLE IF NOT EXISTS backlinks_summary_cache (
    target VARCHAR PRIMARY KEY,                 -- domain oder URL
    summary_json JSON NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_filters (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    endpoint VARCHAR NOT NULL,
    filter_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);
```

`api_calls` braucht keine Schema-Änderung — Backlinks-Calls werden mit
`endpoint='backlinks.detail'` etc. einfach mitgebucht.

### Rate-Limit-Tuning

In `domain/rate.rs`:

```rust
pub fn policy(family: Family) -> RateLimit {
    match family {
        Family::GoogleAdsLive => RateLimit { rpm: 12, max_concurrent: 1 },
        Family::Labs          => RateLimit { rpm: 600, max_concurrent: 5 },
        Family::SerpLive      => RateLimit { rpm: 1200, max_concurrent: 10 },
        Family::SerpTask      => RateLimit { rpm: 2000, max_concurrent: 30 },
        Family::Backlinks     => RateLimit { rpm: 2000, max_concurrent: 30 }, // NEU
    }
}
```

### Caching-Policy

Aggressiver als Tier 1:

| Daten | TTL | Begründung |
|---|---|---|
| `backlinks_summary_cache` | 24 h frisch, opt-in stale | Aggregat ändert sich langsam |
| `referring_domains` (volles Set) | 7 Tage | Liste wächst langsam |
| `backlinks` (Detail) | nicht gecacht | Listen sind zu volatil und individuell |
| `anchors` | 24 h | Verteilung ändert sich langsam |
| `history` | 30 Tage | per Definition historisch |

→ User-spürbarer Mehrwert: die Default-Domain-Übersicht im Dashboard wird
nach dem ersten Klick gratis, solange der Cache frisch ist.

### Frontend-Deltas

```
src/
├── routes/
│   ├── BacklinksPage.tsx       # Neu: Tabs (Summary, Detail, Domains, Anchors, History, Gap)
│   └── DomainPage.tsx          # Erweitert: Backlinks-Summary-Tile
├── components/
│   ├── FilterBuilder/          # Neu — eigene Sub-Komponenten
│   │   ├── FilterBuilder.tsx
│   │   ├── ConditionRow.tsx
│   │   ├── GroupRow.tsx
│   │   └── ValueInput.tsx
│   ├── BacklinksSummaryCard.tsx
│   ├── LinkGapMatrix.tsx
│   └── SavedFiltersDropdown.tsx
└── lib/
    ├── backlinks-fields.ts     # Field-Definitionen pro Endpoint
    └── filters.ts              # Type, Builder-Helpers, JSON-Serialisierung
```

---

## Teil 6: Phase-2-Implementation-Milestones

| # | Milestone | Aufwand |
|---|---|---|
| 1 | **Schema-Migration v0002** + `saved_filters`-Store. | 1 h |
| 2 | **`domain/filters.rs`** — Filter-Typ, DataForSEO-Serialisierung, Tests. | 3 h |
| 3 | **API-Layer** — `api/backlinks.rs` mit 6 Endpoints, Wiremock-Tests. | 4 h |
| 4 | **Cost-Estimator-Erweiterung** — 6 neue Varianten + Tests. | 1 h |
| 5 | **Backlinks Summary Page** — Dashboard-Tiles für eine Domain. | 3 h |
| 6 | **FilterBuilder-Komponente** — flacher Modus, alle Operatoren. | 6 h |
| 7 | **Backlinks Detail Page** — Tabelle mit FilterBuilder + Pagination. | 4 h |
| 8 | **Referring Domains Page** + **Anchors Page**. | 3 h |
| 9 | **History Chart** + **Domain-Intersection (Link-Gap)**. | 4 h |
| 10 | **Erweiterter Filter-Modus** (Gruppierung, OR). | 4 h |
| 11 | **Saved Filters UI** + Dropdown. | 2 h |
| 12 | **Polish** — Empty-States, Cost-Warnungen, Cache-Hints. | 3 h |

**Summe:** ~38 h. Drei intensive Wochenenden oder fünf Abende.

---

## Teil 7: Open Questions & Decisions Deferred

### Q1: Make.com-Workflow-Export für commitment-freie Nutzung?

**Entscheidung:** Phase 3, nicht Phase 2. Erst die ersten 10 zahlenden User
abwarten und schauen, wie viele am Commitment scheitern. Aufwand
~8 h, lohnt sich nur wenn ≥ 30 % der Interessenten daran scheitern.

### Q2: Bulk-Modus für mehrere Targets?

**Entscheidung:** In Phase 2 maximal 1 Target pro UI-Action. Bulk via
Standard-Queue-Pipeline (Wiederverwendung des Tier-1-Task-Systems) in
Phase 3. Erwartet Tier-3-Architektur-Refactor (`tasks` Tabelle wird
generisch mit `kind`-Discriminator).

### Q3: Wie tief das Crawling für „komplette Domain"?

**Default:** Top 10.000 Backlinks (10 Requests à 1000 Zeilen, ca. 0,50 USD).
Power-User können bis 100.000 Backlinks freischalten via Settings, mit
Cost-Warnung.

### Q4: Brauchen wir SafetyNet gegen versehentliche teure Calls?

**Ja.** Im Cost-Preview-Dialog bei Backlinks: wenn geschätzte Kosten > 1 USD,
zweistufige Bestätigung („Ich verstehe, dass dieser Call ~X USD kostet").
Konfigurierbarer Threshold in den Settings.

### Q5: Filter-Builder auch für Labs-Endpoints (Phase 1.5)?

DataForSEO Labs unterstützt `filters[]` ähnlich wie Backlinks. Wenn der
Filter-Builder steht, kann er einfach in `keywords_for_site` und
`ranked_keywords` (Tier 1) nachträglich integriert werden — ohne grosse
Refactors. Lohnt sich als Quick-Win nach Milestone 6.

---

## Teil 8: Was als Nächstes ansteht

→ **Filter-Builder-Mockup** (Figma oder reines HTML/CSS) als Visualisierung
für Stakeholder, bevor Implementierung startet.

→ **Cost-Estimator-Erweiterung** in `domain/cost.rs` — niedriges Risiko,
sofort startbar, validiert die Pricing-Annahmen über Tests.

→ **Phase-3-Vorausschau:** Bulk-Workflows + On-Page (Tier 3 aus dem
Original-Mapping) bauen auf demselben Filter-Builder + Task-System auf.
Phase 2 ist also auch eine Vorinvestition in Phase 3.
