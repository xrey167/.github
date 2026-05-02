# DataForSEO App: SEMrush-Parity-Plan

**Projektkontext:** Strategie-Dokument für die Erweiterung der Tauri-App
(`apps/dataforseo-app`) zu einem SEMrush-Funktionsumfang. Anschluss an
`DATAFORSEO_API_MAPPING.md`, `DATAFORSEO_ARCHITECTURE.md` und
`DATAFORSEO_BACKLINKS_PHASE2.md`.

**Stand:** Mai 2026.
**Frage:** Welche SEMrush-Kernfunktionen kann die App über die DataForSEO-API
realistisch nachbauen — was geht direkt, was geht teilweise, was nicht?

---

## Teil 0: SEMrush-Funktions-Inventar

SEMrush bündelt sechs Hauptbereiche, die hier als Mapping-Grundlage dienen:

1. **Keyword Research** — Volumen, Schwierigkeit, Trends, Verwandt, Long-Tail
2. **Domain Analytics** — Traffic-Schätzung, Ranked Keywords, Konkurrenten,
   Top Pages, Subdomain-Aufteilung
3. **Competitive Research / Gap Analysis** — Keyword-Gap, Backlink-Gap,
   Bulk-Domain-Vergleich
4. **Backlink Analytics** — Backlinks, Referring Domains, Anchor-Profil,
   Lost/New Links, Toxic Score
5. **Position Tracking / Rank Tracking** — tägliche/wöchentliche SERP-Position
   pro Keyword × Land × Device
6. **On-Page & Technical SEO** — Site Audit, Page-Issues, Core Web Vitals,
   Schema-Errors

Plus: Content-Tools (Content Audit, Topic Research, SEO Writing Assistant) —
das sind Editorial-Workflows, die DataForSEO nicht direkt liefert; wir
betrachten sie separat in Teil 7.

---

## Teil 1: Direkt 1:1 abbildbar

Diese Funktionen lassen sich ohne Eigenleistung aus DataForSEO-Endpunkten
zusammensetzen. „Eigenleistung" = nur UI + Aggregation in der App.

| SEMrush-Feature | DataForSEO-Endpunkt(e) | App-Status |
|---|---|---|
| Keyword Volume / CPC / Competition | `keywords_data/google_ads/search_volume/live` | ✅ Tier 1 (PR #18) |
| Keyword Suggestions | `dataforseo_labs/google/keyword_suggestions/live` | ✅ Tier 1 (PR #19) |
| Related Keywords | `dataforseo_labs/google/related_keywords/live` | ✅ Tier 1 (PR #19) |
| Domain Overview (Ranked Keywords) | `dataforseo_labs/google/ranked_keywords/live` | ✅ Tier 1 (PR #20) |
| Keywords by Domain | `dataforseo_labs/google/keywords_for_site/live` | ✅ Tier 1 (PR #20) |
| Live SERP Inspector | `serp/google/organic/live/regular` | ✅ Tier 1 (PR #21) |
| Bulk Position Snapshot | `serp/google/organic/task_post` + Standard Queue | ✅ Tier 1 (PR #22) |
| Backlinks Liste + Filter | `backlinks/backlinks/live` mit `filters[]` | 📋 Phase 2 (Mapping in PR #17) |
| Referring Domains | `backlinks/referring_domains/live` | 📋 Phase 2 |
| Anchor Profile | `backlinks/anchors/live` | 📋 Phase 2 |
| Backlinks Trend (History) | `backlinks/history/live` | 📋 Phase 2 |
| Link-Gap Analyse | `backlinks/domain_intersection/live` | 📋 Phase 2 |
| Site Audit (technisch) | `on_page/task_post` + diverse `*/{id}` GETs | 📋 Phase 3 |
| Lighthouse / Core Web Vitals | `on_page/lighthouse/task_post` | 📋 Phase 3 |
| SERP Competitors für Keyword-Sets | `dataforseo_labs/google/serp_competitors/live` | 🆕 Phase 2 add |

→ **Schon ~70% des SEMrush-Surface ist mit Tier 1–3 abgedeckt.** Was fehlt,
sind Aggregat-Dashboards und mehrere Hilfs-Endpunkte.

---

## Teil 2: Direkt mit zusätzlichen DataForSEO-Endpunkten

DataForSEO hat noch viele Endpunkte, die in den bisherigen Mapping-Dokumenten
nicht aufgeführt sind, weil sie nicht zu Tier 1 oder Phase 2 gehörten. Liste
der relevanten:

### A) DataForSEO Labs (zusätzlich zu den vier Tier-1-Endpunkten)

| SEMrush-Pendant | DataForSEO-Endpunkt | Wert |
|---|---|---|
| Domain Overview Metriken | `dataforseo_labs/google/domain_rank_overview/live` | Sichtbarkeits-Score, organic ETV, paid ETV |
| Subdomain-Aufteilung | `dataforseo_labs/google/subdomains/live` | „Welche Subdomains tragen wieviel Traffic?" |
| SEO-Konkurrenten | `dataforseo_labs/google/competitors_domain/live` | Direkt vergleichbar mit SEMrush "Organic Competitors" |
| Keyword-Gap (Domain-Schnitt) | `dataforseo_labs/google/domain_intersection/live` | Findet Keywords, die Konkurrenten haben und du nicht |
| Page-Gap | `dataforseo_labs/google/page_intersection/live` | Seiten-Ebene Gap |
| Bulk Keyword Difficulty | `dataforseo_labs/google/bulk_keyword_difficulty/live` | KD-Score für 1000 Keywords/Call |
| Top Pages einer Domain | `dataforseo_labs/google/relevant_pages/live` | „Welche Seiten der Domain ranken am besten?" |
| Historical Search Volume | `dataforseo_labs/google/historical_search_volume/live` | 4 Jahre Verlauf (vs. Google Ads' 24 Monate) |
| Keywords Categories | `dataforseo_labs/google/categories_for_keywords/live` | Klassifikation für Topic-Cluster |

### B) Keyword Difficulty (eigenes SEMrush-Markenzeichen)

DataForSEO bietet einen eigenen KD-Score:

- Single: `dataforseo_labs/google/keyword_difficulty/live` (~$0.01 für 1
  Keyword)
- Bulk: `dataforseo_labs/google/bulk_keyword_difficulty/live` (~$0.01 für
  1000 Keywords)

→ **Sollte ab Tier 1 als zusätzliches Feld in der Volume-Tabelle erscheinen.
Aufwand:** ~1h zusätzliche Spalte plus optional separater KD-Lookup-Mode.

### C) Trends Cluster

`keywords_data/google_trends/explore/live` — Saisonale Trend-Charts wie
SEMrush "Keyword Magic Tool > Trend".

### D) AI / LLM Mentions

`ai_optimization/llm/llm_responses/live` — neu in 2026, gibt zurück, ob ein
Keyword in ChatGPT/Perplexity-Antworten zu spezifischen URLs führt. SEMrush
hat hier kein direktes Pendant, deutliche Differenzierungs-Chance.

### E) Content Analysis

`content_analysis/summary/live` — Sentiment-Score, Topic-Klassifikation,
Co-Citations einer URL. SEMrush "Content Audit" Pendant.

---

## Teil 3: Eigenleistung notwendig (Aggregation / Modellierung)

Diese SEMrush-Funktionen lassen sich nicht 1:1 mappen — sie erfordern
DataForSEO-Daten plus eigene App-seitige Berechnung oder Speicherung.

### 3.1 Position Tracking („Daily Rank Tracker")

SEMrush trackt Keyword-Positionen täglich/wöchentlich in der Zeit. DataForSEO
liefert per `serp_task_post` immer nur Snapshots — die Zeitreihe muss die
**App** speichern.

**Architektur-Skizze:**

```sql
CREATE TABLE rank_tracking_keywords (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    project_id BIGINT NOT NULL,
    keyword VARCHAR NOT NULL,
    location_code INTEGER NOT NULL,
    language_code VARCHAR NOT NULL,
    device VARCHAR NOT NULL,                   -- 'desktop' | 'mobile'
    target_domain VARCHAR NOT NULL,            -- "myclient.de"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rank_tracking_history (
    keyword_id BIGINT NOT NULL,
    measured_at DATE NOT NULL,
    rank_absolute INTEGER,                     -- NULL = nicht in top 100
    serp_url VARCHAR,
    PRIMARY KEY (keyword_id, measured_at)
);
```

**Worker:** ein Cron-ähnlicher Tokio-Task, der täglich um Uhrzeit X für jede
aktive Project × Keyword Kombination einen `serp_task_post` einreicht. Ergebnis
wird mit `target_domain`-Filter ausgewertet (Position der ersten URL der
Domain in den Items).

**Aufwand:** 2–3 Wochen, weil das Scheduling-Modell, die Project-Konzeption
und das UI (Charts pro Keyword, Heatmap pro Projekt) neu sind.

### 3.2 Toxic Backlink Score

SEMrush Toxic Score ist ein heuristisches Modell. DataForSEO liefert keinen
fertigen Score, aber alle Eingaben:

- `domain_from_rank` (DR-Äquivalent)
- `is_lost`, `tld`, `is_broken`
- Anchor-Diversität
- Verteilung pro Subnet

**Eigenleistung:** Eine reine Domain-Logik-Schicht (`domain/toxicity.rs`),
die einen 0–100-Score aus diesen Eingaben berechnet. Open-Sourcing der
Heuristik ist möglich, weil sie nicht proprietär sein muss — entlastet die
„Black Box"-Kritik an SEMrush.

**Aufwand:** ~1 Woche für ein V1-Modell, das ahrefs/SEMrush qualitativ
nahekommt.

### 3.3 Domain Authority / Trust Score

DataForSEO hat `rank` pro Domain (eigene Metrik), aber kein direktes
Authority-Score-Pendant. Lösungsoptionen:

- **A:** DataForSEOs `rank` 1:1 als „Domain Authority" benennen.
  Funktioniert als Verkaufs-Hook, ist aber technisch weniger ausgereift als
  Moz DA / ahrefs DR.
- **B:** Zusatz-Provider (Moz API, ahrefs API) einbinden, was App-Pricing
  komplizierter macht.
- **C:** App-eigene Scoring-Funktion aus DataForSEO-Eingaben:
  `referring_domains_count + log(top_keywords_count) + organic_etv`. Reicht
  für die Visualisierung, korreliert mit DA aber nicht 1:1.

**Empfehlung:** **A** für MVP, **C** als optionaler eigener Score in Phase 4.

### 3.4 Content Audit / SEO Writing Assistant

Diese SEMrush-Tools schreiben Empfehlungen für Texte („Add keyword X to H2",
„Lengthen to 1200 words"). Erfordern:

- Crawling der eigenen URLs (haben wir via `on_page/`-API, Phase 3).
- LLM-Schicht für Empfehlungen — neu, separates Cost-Center.

**Modellierung:**

```rust
pub struct ContentRecommendation {
    pub url: String,
    pub recommendations: Vec<Recommendation>,  // typed enum
}

pub enum Recommendation {
    AddKeyword { keyword: String, in_section: Section },
    AdjustLength { current: u32, suggested: u32 },
    AddSchemaMarkup { schema_type: String },
    ImproveTitle { reason: String },
    // ...
}
```

LLM-Prompt → DataForSEO-Daten plus Page-HTML → strukturierte Empfehlungen.
**Aufwand:** Kompletter eigener Track, ~3 Wochen, hängt von LLM-Provider-
Wahl ab.

### 3.5 Topic Research / Keyword Clustering

SEMrush gruppiert Keywords thematisch. DataForSEO liefert
`dataforseo_labs/google/keywords_categories` als Klassifikator, plus rohe
Keyword-Listen aus den Tier-1-Endpunkten. App-seitig muss die
Cluster-Logik erfolgen:

- **Naive:** Hierarchische Clustering auf Keyword-Embeddings (App fährt
  einen lokalen Embedding-Endpoint, z. B. via `ort`-Crate + ONNX).
- **Pragmatisch:** DataForSEO-Categories als Cluster-Schlüssel direkt
  übernehmen.

**Empfehlung:** Pragmatisch im MVP, Embedding-Variante als Phase-4-Feature.

---

## Teil 4: Was nicht (gut) geht

Ehrlichkeits-Sektion. Folgende SEMrush-Funktionen sind ohne andere
Provider nicht sauber nachbaubar:

### 4.1 Traffic Analytics (Clickstream-Daten zu fremden Domains)

SEMrush hat .Trends/Traffic Analytics, das **echte** Clickstream-Daten von
Drittanbietern (z. B. Web-Tracker-Panels) nutzt — es zeigt also „Diese Domain
bekam letzten Monat 2,3M Visits". DataForSEO hat einen Ansatz mit
`clickstream_data/dataforseo_search_volume`, aber nur für Keyword-Volumen.

**Konsequenz:** Direktes „Traffic Analytics für jede Domain" — nicht
realistisch. Mögliche Workarounds: Schätzung über `etv` Summe der ranked
keywords (Über-/Untertreibung möglich um Faktor 2–5).

### 4.2 Position Tracking mit minutengenauer Granularität

DataForSEO Standard Queue antwortet in 1–5 Min., Live-SERP ist sekunden-
schnell aber teurer. Für Enterprise „check ranking every 5 min" nicht
praktikabel — Live-SERP wird zu teuer.

### 4.3 Visibility Trend für historische Domains

DataForSEO hat `dataforseo_labs/google/historical_rank_overview` (lt.
Roadmap), aber Historie ist eingeschränkter als SEMrushs zehnjährige
Datenbank.

### 4.4 PPC Research mit Anzeigentexten

DataForSEO hat `keywords_data/google_ads_search_intelligence/*`-Endpunkte,
aber sie liefern keine echten Anzeigen-Creatives wie SEMrush "Advertising
Research". Beschränkt auf Suchvolumen + CPC-Verteilung.

### 4.5 Social-Media-Analytics, Brand Monitoring, PPC Display Network

Komplett out of scope für DataForSEO. Wenn SaaS-Kunden das brauchen,
benötigt die App andere Provider (Brandwatch, Mention.com, ...).

---

## Teil 5: Roadmap zu „SEMrush-Parität (Pragmatisch)"

Schrittweise Umsetzung in vier Tiers. Jeder Tier ist alleinstehend nutzbar
und verkaufbar.

### Tier 1 (✅ in PRs #15–24)

Keywords + SERP + Cost-Ledger. Deckt: Keyword Research,
Domain Overview, Live SERP, Bulk Position Snapshot.

**SEMrush-Parität-Quote:** ~25 % (alle Keyword-Research-Use-Cases
abgedeckt).

### Tier 2 (Phase 2 — Backlinks; Mapping in PR #17)

Backlinks + Filter-Builder + Link-Gap.

**Zusätzlich in Tier 2 aufnehmen** (über das Phase-2-Doc hinaus):

1. **`bulk_keyword_difficulty`** — KD-Score-Spalte in der Volume-Tabelle.
2. **`domain_rank_overview`** — Domain-Sichtbarkeits-Tile auf der DomainPage.
3. **`competitors_domain`** — „Top Competitors"-Liste auf der DomainPage.
4. **`historical_search_volume`** — 4-Jahres-Trend-Chart in der Volume-Detail.
5. **Toxic-Backlink-Score** — eigene Heuristik (Teil 3.2).

**Aufwand:** ~3 Wochen über das Phase-2-Mapping hinaus.

**SEMrush-Parität-Quote nach Tier 2:** ~55 %.

### Tier 3 (Phase 3 — On-Page Audit + Position Tracking)

1. On-Page-Audit-Pipeline (Site Audit Pendant). Architektur-Hint im
   Original-Architektur-Doc Teil 13.
2. **Position Tracking** als neuer Modul-Bereich:
   - Project-Konzept (Domain × Keyword-Liste × Standort)
   - Daily Cron-Task (per `tokio-cron-scheduler` oder einfacher Sleep-Loop)
   - History-Schema (siehe Teil 3.1)
   - UI: Heatmap pro Projekt, Trend-Chart pro Keyword
3. **Keyword Clustering** via DataForSEO-Categories (Teil 3.5 Pragmatisch).

**Aufwand:** ~6 Wochen (Position Tracking ist groß).

**SEMrush-Parität-Quote nach Tier 3:** ~75 %.

### Tier 4 (Phase 4 — Content & AI)

1. **Content Audit** (`on_page/instant_pages/live` + `content_analysis/`).
2. **SEO Writing Assistant** (LLM-Layer — Anthropic Claude oder OpenAI).
3. **Topic Research / Keyword Clustering** mit Embeddings.
4. **AI-Mention-Tracking** (`ai_optimization/llm/*`, **Differenzierungs-
   Feature gegenüber SEMrush**).

**Aufwand:** ~8 Wochen, weil LLM-Pricing/Latenz/Eval ein eigenes Track ist.

**SEMrush-Parität-Quote nach Tier 4:** ~85 % (Traffic Analytics und Social
bleiben out of scope).

---

## Teil 6: Pricing-Implikationen

SEMrush kostet $129–449/Monat pro User. Unsere App soll das günstiger
abbilden, weil DataForSEO pay-as-you-go ist und die App selbst lokal läuft.

### Kostentreiber pro User × Monat (geschätzt für „typischen Power-User")

| Aktivität | Endpunkt | Volumen / Monat | Kosten / Monat |
|---|---|---|---|
| Keyword Research (Volume) | search_volume | 50k Keywords | $3.75 |
| Keyword Suggestions | suggestions | 200 seeds | $1.50 |
| Domain Overview | ranked_keywords | 50 Domains | $0.60 |
| Live SERP Inspection | live SERP | 200 Queries | $0.40 |
| Bulk Position Snapshot | task_post | 5k Keywords | $3.00 |
| Backlinks Audit | backlinks/* | 10 Domains × 10k rows | $5.00 |
| Position Tracking | task_post | 500 KW × 30 Tage = 15k tasks | $9.00 |
| On-Page Audit | on_page/* | 5 Sites × 5000 pages | $3.00 |
| **Summe** | | | **~$26 / Monat** |

### App-Pricing-Modell

- **Free:** Eigenes DataForSEO-Konto bringen, App-Lizenz kostenlos. Cap auf
  2 gespeicherte Projekte.
- **Pro: 29 USD / Monat:** Unbegrenzte Projekte, Auto-Updates, Cloud-Sync der
  Settings (separate Server-Komponente).
- **Agency: 99 USD / Monat:** Multi-User-Lizenzierung, Mandantenfähigkeit
  (in Schema schon vorbereitet, siehe Architektur-Doc Teil 13.5).
- **Enterprise: bespoke:** SaaS-Variante mit Reseller-Backlinks-Konto, also
  „bring your own DataForSEO-Konto entfällt".

→ User zahlt insgesamt: **~55–75 USD/Monat** vs. **130–450 USD/Monat** bei
SEMrush. Differenz ist das Verkaufsargument.

---

## Teil 7: Differenzierungs-Features (über SEMrush hinaus)

Während der Parität-Erreichung können wir **bewusst** über SEMrush
hinausgehen. Drei realistische Hooks:

### 7.1 AI-Mention-Tracking

DataForSEO `ai_optimization/llm/llm_responses` zeigt, ob deine Domain in
ChatGPT/Perplexity/Gemini-Antworten erscheint. SEMrush hat Stand 2026 noch
kein vergleichbares Feature.

**Build:** UI-Modul „LLM Visibility" mit Daily-Cron, das für getrackte
Domains × Prompts überprüft, ob die Domain in der Antwort erwähnt wird.

### 7.2 Cost-Transparency

Jeder Call zeigt den exakten USD-Preis vor und nach Ausführung (haben wir
schon, Tier 1 + Usage-Page). SEMrush versteckt Verbrauch hinter
Limit-Counters; unsere App zeigt jeden Cent.

### 7.3 Open-Source-Toxic-Score

Open-Source unsere Toxic-Score-Heuristik. SEMrush hält das proprietär — wir
nicht, weil es uns nichts nimmt und Vertrauen baut.

### 7.4 Local-First / Offline-fähig

App läuft lokal, Daten in DuckDB, kein Vendor-Lockin. SEMrush ist Cloud-
zentriert. Für DACH-User mit Datenschutz-Skepsis wertvoll.

---

## Teil 8: Was als Nächstes konkret zu tun ist

Vorgeschlagene Reihenfolge der Patches:

1. **Tier 2 abschließen** entlang `DATAFORSEO_BACKLINKS_PHASE2.md` (existiert).
2. **Tier 2 erweitern** um die fünf Punkte aus Teil 5 (KD, Rank Overview,
   Competitors, Historical Volume, Toxic Score).
3. **Architektur-Dokument für Position Tracking** — neuer Modul-Bereich
   (Projects, Daily Worker, History-Schema).
4. **Tier 3 implementieren**: On-Page Audit + Position Tracking.
5. **Tier 4 evaluieren**: Content/AI braucht eine LLM-Provider-Entscheidung
   und ein Pricing-Re-Plan für die App-Tiers.

Parallel:
- **Marketing-Vergleichsmatrix** „App vs. SEMrush" auf der Landing-Page,
  basierend auf Teil 5 dieses Dokuments.
- **Reseller-Konto-Verhandlung** mit DataForSEO falls Tier 4 SaaS-Variante
  realisiert wird (Backlinks-Commitment-Übernahme).
