# DataForSEO API Mapping & Endpunkt-Priorisierung

**Projektkontext:** Lokale Tauri-App als UI-Layer über DataForSEO — internes Tool für BlueBranch/Kingline + späteres SaaS-Produkt.

**Stand:** Mai 2026 — Preise verifiziert über offizielle DataForSEO-Dokumentation und Pricing-Pages.

---

## Teil 1: Pricing-Modell verstehen

### Grundprinzip

DataForSEO arbeitet ausschließlich pay-as-you-go, keine Subscriptions. Es gibt keine monatliche Gebühr für die SERP API; stattdessen ist ein Mindesteinzahlungsbetrag von 50 USD vorgesehen, der für jede DataForSEO-API genutzt werden kann. Guthaben verfällt nicht.

**Wichtige Sonderbedingung Backlinks:** Die Backlinks API hat ein monatliches Mindest-Commitment von 100 USD, das aber für jede beliebige DataForSEO-API ausgegeben werden kann. Das Commitment entfällt, wenn die Backlinks API über Make.com, n8n oder den Google Sheets Connector genutzt wird.

→ **Praktische Konsequenz für dich:** Sobald die App Backlinks-Endpunkte direkt anspricht, fällt für jeden Nutzer die 100-USD-Untergrenze pro Monat an. Das ist eine wichtige Information für die spätere Pricing-Kommunikation: Du verkaufst die UI günstig, aber der User braucht entweder ein DataForSEO-Konto mit ≥100 USD/Monat Commitment, oder du verzichtest auf Backlinks im MVP.

### Drei Geschwindigkeitsstufen für SERP-/Keywords-/On-Page-Endpunkte

| Modus          | Turnaround     | Multiplikator vs. Standard |
| -------------- | -------------- | -------------------------- |
| Standard Queue | bis ~5 Minuten | 1x (Basispreis)            |
| Priority Queue | bis ~1 Minute  | 2x                         |
| Live           | Sekunden       | ~3,3x                      |

DataForSEO berechnet pro Anfrage drei Geschwindigkeitsstufen: Live-Modus zu 0,002 USD/Anfrage, Priority zu 0,0012 USD/Anfrage und Standard zu 0,0006 USD/Anfrage für Queue-basierte Requests.

**Architekturentscheidung für dich:** Die App sollte **per Default auf Standard Queue setzen** — das ist 3,3x billiger und für die meisten SEO-Workflows (Keyword-Recherche, Wettbewerbs-Analyse, Audits) völlig ausreichend. Live-Modus nur als Opt-in für ad-hoc-Checks.

---

## Teil 2: Endpunkt-Inventar mit Preisen

### A) Keywords Data API

#### A1. Google Ads — Search Volume *(MVP-Pflicht)*

**Was:** Suchvolumen, monatlicher Verlauf (24 Monate), CPC, Competition für bis zu 1.000 Keywords pro Request.

Dieser Endpunkt liefert Suchvolumen, monatliche Suchanfragen, Competition und weitere zugehörige Daten für bis zu 1.000 Keywords in einem einzigen Request. Es können maximal 12 Requests pro Minute pro Konto über Google Ads Live-Endpunkte gesendet werden. Historische Daten sind für 24 Monate verfügbar.

**Endpunkte:**

- `POST /v3/keywords_data/google_ads/search_volume/live` *(Live)*
- `POST /v3/keywords_data/google_ads/search_volume/task_post` + `GET /task_get/{id}` *(Standard)*

**Preis pro Request:** ~0,025 USD Live für 1.000 Keywords (≈ 0,000025 USD pro Keyword) — extrem günstig für Bulk-Recherche.

**Rate-Limit:** 12 Requests/Min (Live). Bei 1000 Keywords/Request = 12.000 Keywords/Min möglich.

**Wichtige Felder im Response:**

- `keyword`, `search_volume`, `competition`, `competition_index`
- `cpc`, `low_top_of_page_bid`, `high_top_of_page_bid`
- `monthly_searches[]` (Trend-Daten — perfekt für Charts in der UI)

#### A2. Google — Search Volume (alternativer Endpunkt)

**Endpunkt:** `POST /v3/keywords_data/google/search_volume/live`

Liefert ähnliche Daten, aber mit anderen Methodik-Details (z.B. detailliertere Categories als Array). Cost-Beispiel im Response: cost: 0.15 für 3 Keywords, also höher als Google Ads Endpunkt.

→ **Empfehlung:** Im MVP den Google Ads Endpunkt nutzen (günstiger pro Keyword), den Google-Endpunkt erst später als "Erweiterte Methode" anbieten.

#### A3. DataForSEO Search Volume *(differenzierender Endpunkt — wichtig für Verkaufsargument)*

**Was:** Eigenes, verfeinertes Suchvolumen, das Google Ads + Bing Ads ODER Clickstream-Daten kombiniert. Liefert granularere Werte als Google Ads, das Synonyme oft zusammenfasst.

**Endpunkt:** `POST /v3/keywords_data/clickstream_data/dataforseo_search_volume/live`

DataForSEO Search Volume kombiniert Google Ads-Daten mit Bing- oder Clickstream-Insights für zuverlässigere Suchvolumen-Schätzungen. Verfügbar in Keyword Data API und DataForSEO Labs API, mit Toggle zwischen Bing- und Clickstream-Refinement.

→ **Verkaufs-Hook:** „Genauere Suchvolumen-Daten als Google Ads selbst, weil Synonyme nicht zusammengefasst werden" — das ist ein konkretes Differenzierungs-Argument gegenüber kostenlosen Keyword-Tools.

#### A4. Google Trends

**Endpunkte:**

- `POST /v3/keywords_data/google_trends/explore/live`
- `POST /v3/keywords_data/google_trends/categories`

**Wert für UI:** Saisonale Trend-Charts, Vergleich von bis zu 5 Keywords. Komplementär zu Search Volume.

**Priorität:** Mittel — schöne Erweiterung in Phase 2/3, kein MVP-Blocker.

#### A5. Bing Ads Keyword Data

Spiegelt Google Ads für Bing. Niche, aber relevant für B2B-/Enterprise-Kunden in DACH (Bing-Anteil bei Microsoft-Edge-Usern).

**Priorität:** Niedrig im MVP, später als „Pro-Feature".

---

### B) DataForSEO Labs API *(separates API-Set für Keyword-Recherche & Wettbewerbsanalyse)*

DataForSEO Labs API kombiniert aktuelle Daten aus Google Ads und Google Search mit historischen Informationen und Suchintention für Keywords aus den proprietären Keyword- und SERPs-Datenbanken von DataForSEO. Diese API bietet auch Clickstream-Daten für Keywords, einschließlich proprietärem Suchvolumen, geschätztem Traffic und anderen wichtigen Metriken.

#### B1. Keyword Suggestions *(MVP-Pflicht — Kern-SEO-Workflow)*

**Endpunkt:** `POST /v3/dataforseo_labs/google/keyword_suggestions/live`

Keyword Suggestions nutzt einen Volltext-Suchalgorithmus, um eine Vielzahl von Keywords zu liefern, die einen bestimmten Suchbegriff enthalten.

**Use Case:** „Gib mir alle Long-Tail-Keywords mit dem Wort X" — Klassischer SEO-Workflow.

#### B2. Related Keywords *(MVP-Pflicht)*

**Endpunkt:** `POST /v3/dataforseo_labs/google/related_keywords/live`

Related Keywords nutzt Google SERP, um bis zu 4.680 Keyword-Ideen pro Seed-Query bereitzustellen. Der Endpunkt ist darauf ausgelegt, Keyword-Ideen direkt aus Suchmaschinen-Ergebnissen zu liefern, indem Keywords aus den „searches related to"-Sektionen extrahiert werden.

#### B3. Keywords for Site

**Endpunkt:** `POST /v3/dataforseo_labs/google/keywords_for_site/live`

**Was:** „Welche Keywords ranken für eine bestimmte Domain?" — Konkurrenz-Analyse-Kernfunktion.

#### B4. Ranked Keywords

**Endpunkt:** `POST /v3/dataforseo_labs/google/ranked_keywords/live`

Ranked Keywords liefert Daten zu Keywords, für die eine beliebige Domain rankt.

→ Der wichtigste Endpunkt für Wettbewerbs-Recherche. **MVP-Pflicht.**

#### B5. Domain/Subdomain Rank Overview

Komplette Sichtbarkeits-Metriken für eine Domain (Traffic, Keywords, Verlauf).

**Priorität:** Hoch — gehört auf das „Domain-Detail"-Dashboard.

#### B6. SERP Competitors

Identifiziert Wettbewerber-Domains für gegebene Keyword-Sets.

**Priorität:** Mittel — Phase 2.

---

### C) SERP API

#### C1. Google Organic SERP *(MVP-Pflicht)*

**Endpunkte:**

- `POST /v3/serp/google/organic/live/regular` *(Live, ~0,002 USD)*
- `POST /v3/serp/google/organic/live/advanced` *(Live mit erweiterten Daten)*
- `POST /v3/serp/google/organic/task_post` *(Standard, ~0,0006 USD)*

**Was:** Top 10/100 Google-Ergebnisse für Keyword + Standort + Sprache.

**Preisstruktur (vom offiziellen DataForSEO-Pricing-Page):**

Basispreis ist für 10 abgerufene Suchergebnisse bestimmt. Hinzukommt Basispreis pro Modus (0,0006 USD Standard, 0,0012 USD Priority, 0,002 USD Live). Multiplikator 5x pro zusätzlichem Parameter. Beispiel: Autocomplete-Vorschläge für 1 Mio. Keywords im Live-Modus kosten 2.000 USD.

→ **Wichtig fürs UI-Design:** Jeder zusätzliche Parameter im Form (z.B. „mit People-Also-Ask", „mit AI Overview") **multipliziert die Kosten mit 5**. Die App muss live einen Cost-Estimator anzeigen, sonst läuft der User in böse Überraschungen.

#### C2. Weitere SERP-Engines

Unterstützt: Google, Bing, Yahoo, Baidu, DuckDuckGo, Yandex, Naver, YouTube, eBay, Walmart, Apple App Store, Yelp.

→ **MVP-Empfehlung:** Nur Google im MVP. Bing als Phase-2-Add-on.

#### C3. Spezielle Google-SERP-Typen

- Google Maps SERP — lokale Pack-Ergebnisse (relevant für lokale SEO-Kunden)
- Google News SERP
- Google Images SERP
- Google Shopping SERP — relevant für E-Commerce-Mandanten
- Google Jobs SERP

→ **Priorität:** Maps + Shopping in Phase 2 (sind für Kingline-/BlueBranch-Mandanten potenziell relevant).

---

### D) Backlinks API *(differenziert, aber teurer Einstieg)*

Backlinks API berechnet 0,02 USD pro API-Request plus 0,00003 USD pro abgerufener Datenzeile. Maximal 1.000 Zeilen pro Request. Beispiel: Eine Anfrage mit 1.000 Zeilen kostet 0,02 USD + 0,03 USD = 0,05 USD.

**Zusätzlich:** Bis zu 2000 API-Calls pro Minute, max. 30 simultane Requests.

#### D1. Backlinks *(MVP-Pflicht für Backlinks-Modul)*

**Endpunkt:** `POST /v3/backlinks/backlinks/live`

**Was:** Liste aller Backlinks für eine Ziel-Domain mit allen Eigenschaften (DR, Anchor, Dofollow, etc.).

**Filter-Möglichkeit (sehr wichtig für UI):**

- `filters: ["dofollow", "=", true]` — komplexe Filter direkt in der API.
- → Dein UI sollte einen visuellen Filter-Builder haben, der diese Syntax generiert.

#### D2. Backlinks Summary

**Endpunkt:** `POST /v3/backlinks/summary/live`

**Was:** Aggregat-Metriken (Total Backlinks, Referring Domains, Verteilung Dofollow/Nofollow, TLD-Verteilung). Cheap & schnell, perfekt für Dashboard-Tile.

#### D3. Backlinks History

**Endpunkt:** `POST /v3/backlinks/history/live`

**Was:** Historische Daten zur Backlink-Anzahl seit 2019. Trend-Charts.

#### D4. Referring Domains

**Endpunkt:** `POST /v3/backlinks/referring_domains/live`

**Was:** Aggregierte Liste der verlinkenden Domains mit Domain-Metriken.

#### D5. Anchor Text Analysis

**Endpunkt:** `POST /v3/backlinks/anchors/live`

**Was:** Anchor-Text-Verteilung — wichtig für Penalty-/Linkprofil-Audit.

#### D6. Domain Intersection / Page Intersection

**Endpunkte:**

- `POST /v3/backlinks/domain_intersection/live`
- `POST /v3/backlinks/page_intersection/live`

Diese Endpunkte liefern alle Daten, die für die Implementierung eines Link-Gap-Features benötigt werden: Domain Intersection - Domains, die auf Ziel-Websites verweisen; Page Intersection - Seiten, die auf Ziel-Websites verweisen.

→ **Differenzierungs-Feature:** „Link Gap Analyse" ist ein klassisches ahrefs-Premium-Feature. Wenn deine App das einfach zugänglich macht, ist das ein starkes Verkaufsargument.

---

### E) On-Page API

DataForSEO On-Page API ermöglicht detaillierte technische SEO-Audits für Tausende URLs ohne aufwändige In-House-Scraping-Tools. Bewertet Website-Performance über 60+ On-Page-SEO-Metriken mit anpassbaren Benchmarks. Unterstützt Googles Open-Source Lighthouse-Projekt zur Messung der Qualität von Webseiten.

#### E1. Task-basierter Workflow *(Kernunterschied zu allen anderen APIs!)*

On-Page-Audits sind **immer asynchron**. Das ist architektonisch wichtig:

**Workflow:**

1. `POST /v3/on_page/task_post` — Audit starten (max_crawl_pages festlegen)
2. Polling: `GET /v3/on_page/tasks_ready` oder per Webhook
3. Wenn fertig: Diverse `GET`-Endpunkte zum Abrufen der Ergebnisse
   - `summary/{id}` — Übersicht
   - `pages/{id}` — Liste aller gecrawlten Seiten
   - `resources/{id}` — Ressourcen
   - `duplicate_tags/{id}` — Duplicate Title/Meta
   - `non_indexable/{id}` — Indexierungs-Probleme
   - `links/{id}` — interne Links
   - `redirect_chains/{id}` — Redirect-Probleme
   - `lighthouse/{id}` — Performance-Daten

→ **UI-Konsequenz:** Du brauchst einen "Tasks"-Tab in der Sidebar, der laufende & abgeschlossene Audits zeigt. Dies ist die einzige API-Familie, die einen lokalen Task-Status braucht (in SQLite persistiert, beim App-Start abgleichen).

#### E2. Lighthouse API

**Endpunkt:** `POST /v3/on_page/lighthouse/task_post`

**Was:** Performance-/Accessibility-/Best-Practices-Audit pro URL.

→ Sinnvolle Erweiterung der On-Page-Audits.

---

## Teil 3: MVP-Priorisierung — was wann bauen

### Tier 1 — MVP Wave 1 (Wochenende 1+2): „Keywords + SERP"

Sechs Endpunkte, die zusammen 80% des täglichen SEO-Workflows abdecken:

1. `keywords_data/google_ads/search_volume/live` — Suchvolumen-Bulk
2. `dataforseo_labs/google/keyword_suggestions/live` — Long-Tail-Keywords
3. `dataforseo_labs/google/related_keywords/live` — Verwandte Keywords
4. `dataforseo_labs/google/ranked_keywords/live` — „Wofür rankt diese Domain?"
5. `serp/google/organic/live/regular` — Live-SERP-Check
6. `serp/google/organic/task_post` + `task_get` — Bulk-SERP für Rank-Tracking

**Warum diese Reihenfolge:** Diese sechs erlauben dir bereits den kompletten Recherche-Workflow: Seed-Keyword eingeben → Suggestions bekommen → Volumen prüfen → SERP analysieren → Wettbewerber-Domains in Ranked-Keywords ansehen. Das ist allein schon ein verkaufbares Produkt.

**Geschätzter Implementierungsaufwand:** ca. 20-25 Stunden für Rust-API-Layer + React-UI.

### Tier 2 — MVP Wave 2 (Wochenende 3): „Backlinks"

1. `backlinks/summary/live` — Dashboard-Übersicht
2. `backlinks/backlinks/live` — Detail-Liste mit Filterung
3. `backlinks/referring_domains/live` — verlinkende Domains
4. `backlinks/anchors/live` — Anchor-Profil
5. `backlinks/history/live` — Trend-Daten
6. `backlinks/domain_intersection/live` — **Link-Gap-Analyse** (Verkaufs-Hook)

**Wichtige UX-Anforderung:** Wegen der 100-USD/Monat-Commitment-Regel braucht das Backlinks-Modul einen prominenten Hinweis in der UI: „Dieses Modul erfordert ein DataForSEO-Konto mit Backlinks-Aktivierung (Mindestumsatz $100/Monat)."

### Tier 3 — MVP Wave 3 (Wochenende 4): „On-Page Audit"

1. `on_page/task_post` — Audit starten
2. `on_page/summary/{id}` — Audit-Übersicht
3. `on_page/pages/{id}` — Pages-Liste mit Issues
4. `on_page/duplicate_tags/{id}` — Duplicate Tags
5. `on_page/non_indexable/{id}` — Indexierungs-Probleme
6. `on_page/redirect_chains/{id}` — Redirect-Issues

**Architektur-Neuerung:** Persistenter Task-Manager in SQLite + Polling-Worker im Rust-Backend. Erste asynchrone Komponente.

### Tier 4 — Phase 2-Erweiterungen (nach MVP-Release)

- Google Trends, Bing SERP, Google Maps SERP
- Lighthouse-Integration in On-Page
- Content Analysis API (Sentiment-Analyse, Co-Citations)
- AI Optimization API (LLM Mentions — relevant in 2026!)

---

## Teil 4: Cost-Estimator-Logik für die UI

Pflicht-Feature: **Vor jedem API-Call dem User die geschätzten Kosten zeigen.** Das verhindert die häufigste Beschwerde bei DataForSEO-Tools (unerwartete Kosten).

### Cost-Estimation-Funktionen (Pseudocode für Rust-Backend)

```
estimate_keywords_data_cost(keyword_count, mode):
    base_cost_per_request = match mode:
        "live"    => 0.075  // Google Ads Live mit 1000 Keywords
        "standard" => 0.05   // Google Ads Standard
    requests = ceil(keyword_count / 1000)
    return requests * base_cost_per_request

estimate_serp_cost(query_count, mode, depth, extra_params):
    base = match mode:
        "live"     => 0.002
        "priority" => 0.0012
        "standard" => 0.0006
    multiplier = 1.0
    if depth > 10:
        multiplier *= ceil(depth / 100) + 1  // depth-Parameter
    multiplier *= 5 ^ extra_params  // 5x pro zusätzlichem Parameter!
    return query_count * base * multiplier

estimate_backlinks_cost(target_count, rows_per_target):
    return target_count * (0.02 + rows_per_target * 0.00003)

estimate_on_page_cost(max_crawl_pages):
    // On-Page ist seitenbasiert, ~$0.000125 pro gecrawlter Seite
    return max_crawl_pages * 0.000125
```

### UI-Integration

Vor jedem „Run"-Button:

```
┌──────────────────────────────────────────┐
│ Geschätzte Kosten: $0.024                │
│ • 1000 Keywords × Live × Google Ads      │
│ • Standort: Deutschland                  │
│                                          │
│ Verbleibendes Guthaben: $48.32           │
│                            [Ausführen]   │
└──────────────────────────────────────────┘
```

Nach dem Call: Tatsächliche Kosten aus `cost`-Feld der API-Response in lokaler SQLite-DB persistieren → langfristig „Verbrauch nach Modul"-Statistik möglich.

---

## Teil 5: Architektur-relevante Eigenschaften pro Endpunkt-Familie

Diese Tabelle entscheidet über die UI-Patterns:

| Familie       | Sync/Async    | Bulk?           | Filter-Sprache? | Retention  | Rate-Limit                |
| ------------- | ------------- | --------------- | --------------- | ---------- | ------------------------- |
| Keywords Data | beide         | bis 1000 KW/req | nein            | 24 Mo      | 12 req/min (Live)         |
| Labs          | live/standard | bis 1000        | ja (filters[])  | unbegrenzt | hoch                      |
| SERP          | beide         | bis 100 KW/req  | nein            | n/a        | hoch                      |
| Backlinks     | live/task     | bis 1000 rows   | ja (filters[])  | seit 2019  | 2000 req/min, 30 parallel |
| On-Page       | nur Task      | komplette Site  | nein            | 30 Tage    | hoch                      |

→ **Wichtige UX-Konsequenzen:**

1. **Bulk-Eingaben:** Keywords + SERP UI müssen Multi-Line-Textareas haben (eine Zeile = ein Keyword). Mit Counter „X Keywords entdeckt — geschätzt: $Y".
2. **Filter-Builder:** Labs + Backlinks unterstützen native Filter mit Operatoren. Statt einer simplen Textsuche solltest du einen visuellen Filter-Builder bauen (Spalte → Operator → Wert), der automatisch das `filters[]`-Array generiert. Das ist ein echtes Differenzierungs-Feature.
3. **Task-Manager:** Nur On-Page braucht Background-Polling. Aber wenn es einmal gebaut ist, kannst du auch SERP- und Keywords-Standard-Modus durchschicken für noch bessere Preise.
4. **Caching:** SERP-Live-Ergebnisse können nicht gecacht werden (sind real-time). Keywords-Search-Volume-Daten dagegen sind 1 Monat stabil → lokale Cache-Schicht in DuckDB lohnt sich enorm. Faustregel: Wenn der User dieselben 1000 Keywords zweimal in 30 Tagen abfragt, sparst er 0,075 USD.

---

## Teil 6: Authentifizierung & Sicherheit

DataForSEO nutzt HTTP Basic Auth mit Login + Password aus dem API-Access-Dashboard.

**Sicherheits-Architektur für Tauri-App:**

1. User gibt Login + Password im Settings-Dialog ein.
2. Rust-Backend speichert die Credentials im **OS-Keychain** (macOS Keychain / Windows Credential Manager / Linux Secret Service) via `keyring`-Crate oder Tauri-Stronghold-Plugin.
3. **Webview hat niemals Zugriff auf die Credentials.** Alle API-Calls gehen über Tauri-Commands ins Rust-Backend, das den Authorization-Header dort konstruiert.
4. Optional für Produkt-Verkauf: „Test Connection"-Button im Settings, der einen leichten Endpunkt wie `/v3/appendix/user_data` aufruft, um Credentials und verbleibendes Guthaben zu validieren.

---

## Teil 7: Wichtige praktische Erkenntnisse

### Erkenntnis 1: Die App muss Standard Queue als Default setzen

3,3x Preisunterschied zwischen Standard und Live ist riesig. Die meisten SEO-Workflows können warten — Rank-Tracking kann täglich laufen, Keyword-Recherche ist nicht zeitkritisch. Default = Standard, Live als bewusste Opt-in-Entscheidung.

### Erkenntnis 2: Der „filters"-Parameter ist ein Verkaufsargument

DataForSEO-Endpunkte (besonders Labs und Backlinks) unterstützen komplexe Filter direkt in der API. Konkurrenz-Tools wie SEranking-API oder ahrefs-API haben das nicht so flexibel. Ein guter visueller Filter-Builder in deiner UI macht das nutzbar — und ist ein Feature, das man verkauft.

### Erkenntnis 3: DataForSEO Search Volume als Differenzierungs-Argument

Das ist DataForSEOs eigenes proprietäres Feature, das Suchvolumen *genauer* als Google Ads selbst macht (durch Auflösung der Synonym-Gruppen). Das ist Marketing-Material: „Genauere Daten als Google Ads selbst."

### Erkenntnis 4: Die 100-USD-Backlinks-Schwelle braucht Pricing-Strategie

Du hast drei Optionen:

- **A:** Backlinks erst in Phase 2/3, mit klarem Hinweis auf Mindesteinsatz.
- **B:** „Light"-Modus für Backlinks, der nur die Summary-Endpunkte nutzt (geringer Volumenverbrauch).
- **C:** Strategische Partnerschaft / Reseller-Modell mit DataForSEO, bei dem du als App-Anbieter den Mindesteinsatz übernimmst und in dein Pricing einrechnest. Das wäre für die SaaS-Variante interessant.

### Erkenntnis 5: On-Page = Task-Architektur als Lehrstück

On-Page ist die einzige Familie, die zwingend asynchron ist. Wenn du das gut baust (mit lokaler Persistenz, Auto-Polling, Status-UI), kannst du das gleiche Muster für Bulk-Workflows in anderen Familien nutzen. Z.B. „Bulk SERP für 10.000 Keywords" als Standard-Queue-Task — viel günstiger als 10.000 Live-Calls.

---

## Teil 8: Was als Nächstes ansteht

Mit diesem Mapping als Grundlage sind die nächsten Schritte (gemäß deiner Priorisierung):

**→ Architektur-Dokument:** Übersetzt diese Endpunkt-Charakteristika in konkrete Tauri/Rust/React-Komponenten — Module-Struktur, Daten-Flow, DuckDB-Schema, Task-Manager-Design.

**→ Tauri-Skelett:** Implementiert das Architektur-Dokument für Tier 1 (Keywords + SERP) als lauffähiges Projekt.

**→ Pricing/GTM:** Übersetzt die Endpunkt-Kosten in App-Pricing-Tiers (z.B. „Free: nur Keywords-Endpunkte, Pro: + Backlinks + On-Page").
