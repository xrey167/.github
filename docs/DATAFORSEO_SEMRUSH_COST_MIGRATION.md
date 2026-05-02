# SEMrush → DataForSEO App: Cost Migration Checklist

**Projektkontext:** Praktische Antwort auf die Frage „was sollte ich aus
SEMrush exportieren und dann SEMrush kündigen?" Anschluss an
`DATAFORSEO_SEMRUSH_PARITY_PLAN.md` (strategischer Plan) und
`DATAFORSEO_API_MAPPING.md` (Pricing-Grundlagen).

**Stand:** Mai 2026.
**Annahme:** Die App-Stack aus PRs #15-#34 ist installiert und konfiguriert
(DataForSEO-Konto + AI-Provider-Key).

---

## Teil 0: TL;DR

Wenn du heute SEMrush Pro (139 USD/Monat) oder Guru (249 USD/Monat) zahlst:

- **Sofort migrierbar:** Keyword Research, SERP Inspection, Domain Overview
  (Ranked Keywords), Keyword-Gap, Domain-Vergleich, Bulk-Position-Snapshot,
  AI-Workflows. Erspart 100% des Pro-Tier-Werts.
- **Phase-2-migrierbar (~3 Wochenenden):** Backlink Analytics inkl.
  Link-Gap (alle Pendants verfügbar, App-Implementierung steht aus). Sobald
  fertig, deckt das den Guru-Tier-Wert ab.
- **Phase-3-migrierbar (~6 Wochen):** Site Audit, Position Tracking. Deckt
  den Business-Tier-Wert ab.
- **Nicht migrierbar:** Traffic Analytics (Clickstream), Social Media
  Toolkit, PPC Display Network. Wenn du diese aktiv nutzt: behalte SEMrush
  Pro für genau diese drei Module, alles andere migriere.

**Erwarteter Sparbetrag pro Monat (typischer Pro-User):**

Vollkosten-Rechnung — 139 USD SEMrush Pro − 29 USD App-Lizenz (Pro-Tier)
− DataForSEO-Verbrauch je nach Phase. Phase-Zahlen unten enthalten den
DataForSEO-Spend, nicht nur die Lizenz-Differenz:

- Phase A (Tier 1 + AI): 139 − 29 − ~12 ≈ **98 USD/Monat gespart**
- Phase B (+ Backlinks): 139 − 29 − ~27 ≈ **83 USD/Monat gespart**
- Phase C (+ Tracking + On-Page): 139 − 29 − ~40 ≈ **70 USD/Monat gespart**

Savings sinken pro Phase, weil du DataForSEO härter ausreizt — Tradeoff,
keine Verschlechterung. Wer SEMrush Guru (249 USD) oder Business (499 USD)
heute zahlt, spart entsprechend mehr.

---

## Teil 1: Was du aus SEMrush exportieren solltest, BEVOR du kündigst

SEMrush-Daten gehören dir; nach Kündigung sind sie weg. Liste der CSVs, die
du jetzt herunterladen solltest, geordnet nach „kann die App importieren":

### 1.1 Direkt in der App nutzbar (CSV-Import-fähig)

> **Hinweis:** CSV-Import-Buttons stehen aktuell auf der Roadmap. Bis
> dahin liegen die Exporte als Backup; direktes Einlesen via DuckDB-CLI
> ist möglich, aber **mit expliziten Spalten-Aliasen** — SEMrush-CSVs
> haben oft andere Spalten-Reihenfolgen als die App-Tabellen, ein
> `INSERT … SELECT *` würde Daten in die falschen Felder schreiben.
>
> DB-Pfad pro OS:
>
> - macOS: `~/Library/Application Support/com.bluebranch.dataforseo-app/dataforseo-app.duckdb`
> - Linux: `~/.local/share/com.bluebranch.dataforseo-app/dataforseo-app.duckdb`
> - Windows: `%APPDATA%\com.bluebranch.dataforseo-app\dataforseo-app.duckdb`
>
> Sicheres Import-Pattern (Beispiel `keyword_volume_cache`):
>
> ```sql
> INSERT INTO keyword_volume_cache
>     (keyword, location_code, language_code,
>      search_volume, competition, cpc, fetched_at)
> SELECT
>     "Keyword",
>     2276,                         -- Standort manuell setzen
>     'de',
>     CAST("Volume" AS INTEGER),
>     "Competition",
>     CAST("CPC" AS DOUBLE),
>     CURRENT_TIMESTAMP
> FROM read_csv_auto('semrush-export.csv', header=true);
> ```
>
> Spalten-Namen entsprechen den SEMrush-CSV-Headern (case-sensitive); ggf.
> mit `head -1 semrush-export.csv` prüfen und anpassen.

| SEMrush-Modul | Export-Format | Ziel-Tabelle in DuckDB |
|---|---|---|
| Keyword Magic Tool | CSV (Volume + KD + Trend) | `keyword_volume_cache` (24 Mo Volumen) |
| Domain Overview > Organic Research | CSV (Position + Keyword + Volume + Traffic) | (neu, Phase 3 Position Tracking) |
| Backlink Analytics > Backlinks | CSV | `backlinks_summary_cache` (Phase 2) |
| Backlink Analytics > Anchors | CSV | (Phase 2) |
| Position Tracking > Daily | CSV mit History | (Phase 3) |
| Site Audit > Issues | CSV | (Phase 3) |

**Konkrete Schritte:**

1. **Keyword Magic Tool:** Für jeden Seed, den du regelmäßig nutzt, Top
   1000 Keywords + Volumen + KD + Trend exportieren. Über das Limit von
   10k Exporten/Monat im Pro-Tier verteilen.
2. **Domain Overview:** Für deine eigenen Domains und Top-3-Konkurrenten
   die kompletten Ranked-Keywords-Listen exportieren (max ~10k Zeilen pro
   Domain im Pro-Tier).
3. **Backlinks:** Pro Domain die ersten 10k Backlinks + alle Anchors
   exportieren. Das deckt 95% der historischen Backlink-Profile ab.
4. **Position Tracking:** Falls aktiv: die letzten 12 Monate History
   für deine getrackten Keywords. SEMrush erlaubt CSV-Export mit Datum +
   Position pro Keyword.
5. **Site Audit:** Falls aktiv: aktuellster Audit-Lauf als CSV.

### 1.2 Workflow-relevant (für Onboarding in die App)

- **Listen-Manager (Keyword Listen):** Exportiere alle benannten Listen.
  In der App: paste in /keywords/volume oder /compare als zwei Sets.
- **Projekt-Konfigurationen:** Notiere die Standorte, Sprachen, Devices,
  die du in Position Tracking konfiguriert hast — die App's Phase-3-Modul
  wird die gleichen Parameter brauchen.
- **Custom Report Templates:** Wenn du wiederholbare PDF-Reports für
  Mandanten ziehst, die Daten-Anforderungen schreiben. Die App generiert
  noch keine PDFs, aber die strukturierten CSV-Exporte aus jedem Tab +
  AI-Chat-Zusammenfassung decken den 80%-Use-Case bereits ab.

---

## Teil 2: Feature-für-Feature Migrations-Matrix

| SEMrush Feature | Heute in App | Pro Call | Geschätzte Monats-Cost (typisch) | Migrationsstatus |
|---|---|---|---|---|
| Keyword Magic Tool (Volume + KD) | /keywords/volume + /keywords/discover | 0,000075 USD/Keyword | 50k Keywords ≈ 3,75 USD | ✅ Sofort |
| Keyword Difficulty Bulk | (nicht eigen, Volume-Tabelle hat KD-Slot) | gleicher Endpoint | bereits in Volumen-Spend | 🔧 Tier-2-Erweiterung |
| Related Keywords | /keywords/related | 0,0125 USD/Seed | 200 Seeds ≈ 2,50 USD | ✅ Sofort |
| Keyword Suggestions | /keywords/discover | 0,0125 USD/Seed | 200 Seeds ≈ 2,50 USD | ✅ Sofort |
| Topic Research / Cluster | /chat → Cluster Quick Action | ~0,03 USD/Cluster-Run | 30 Runs ≈ 1 USD | ✅ AI-gestützt |
| Domain Overview | /domain | 0,0125 USD/Domain | 50 Domains ≈ 0,60 USD | ✅ Sofort |
| Organic Research (Ranked Keywords) | /domain → Ranked Keywords | 0,0125 USD/Domain | 50 Domains ≈ 0,60 USD | ✅ Sofort |
| Domain vs Domain | /compare → Domains | 2 × 0,0125 USD | 20 Vergleiche ≈ 0,50 USD | ✅ Sofort |
| Keyword Gap | /compare → Domains (Only-B Bucket) | 2 × 0,0125 USD | gleicher Spend | ✅ Sofort |
| Live SERP Inspection | /serp/quick | 0,002 USD/Query | 200 Queries ≈ 0,40 USD | ✅ Sofort |
| Bulk Position Snapshot | /serp/bulk | 0,0006 USD/Query (Standard) | 5k Queries ≈ 3 USD | ✅ Sofort |
| Position Tracking (täglich) | (Phase 3) | siehe oben × 30 Tage | 500 KW × 30 ≈ 9 USD | 📋 Phase 3 |
| Backlink Overview | (Phase 2) | 0,02 USD/Request | 30 Domain-Checks ≈ 0,60 USD | 📋 Phase 2 |
| Backlink Detail (mit Filter) | (Phase 2) | 0,02 + 0,00003/row | 10 × 10k rows ≈ 5 USD | 📋 Phase 2 |
| Backlink Audit / Toxic Score | (eigene Heuristik, Phase 2) | berechnet aus Detail | 0 USD | 📋 Phase 2 |
| Anchor Text Analysis | (Phase 2) | gleicher Endpoint | bereits in Detail-Spend | 📋 Phase 2 |
| Link-Gap (Domain Intersection) | (Phase 2) | 0,02 USD + Rows | 10 USD | 📋 Phase 2 |
| Site Audit | (Phase 3) | ~0,000125 USD/Page | 5 Sites × 5000 ≈ 3 USD | 📋 Phase 3 |
| Lighthouse / CWV | (Phase 3) | extra | 1 USD | 📋 Phase 3 |
| Content Audit | /chat → Cluster + Brief | LLM-basiert | wie AI-Spend | ✅ AI-gestützt |
| SEO Writing Assistant | /chat → Title-Quick-Action | LLM-basiert | wie AI-Spend | ✅ AI-gestützt |
| **Traffic Analytics (Clickstream)** | **kein Pendant** | n/a | n/a | ❌ Behalten |
| **Social Media Toolkit** | **kein Pendant** | n/a | n/a | ❌ Behalten |
| **PPC Display Network** | **kein Pendant** | n/a | n/a | ❌ Behalten |
| Brand Monitoring | (kein DataForSEO-Endpoint) | extra Provider | n/a | ❌ Behalten oder eigener Provider |
| AI Chat über alle Daten | /chat (mit Attachment) | ~0,03 USD/Antwort | 50 Antworten ≈ 1,50 USD | ✅ Differenzierungs-Feature |

**Summe für typischen Pro-User (Mai 2026):**

| Bucket | DataForSEO-Spend | App-Lizenz |
|---|---|---|
| Heute migrierbar (Tier 1 + AI) | ~12 USD/Monat | 29 USD/Monat (Pro) |
| Mit Phase 2 (Backlinks) | +15 USD/Monat | gleich |
| Mit Phase 3 (On-Page + Tracking) | +13 USD/Monat | gleich |
| **Total (Tier 1+2+3)** | **~40 USD/Monat** | **+ 29 USD/Monat = 69 USD/Monat** |

vs SEMrush Pro 139 USD/Monat oder Guru 249 USD/Monat.

---

## Teil 3: Migrations-Reihenfolge (was zuerst?)

### Phase A: Heute, ohne Codeänderung

**Was:** Keyword Research, Domain Overview, Live-SERP, Bulk-Snapshot,
Compare, AI-Workflows.

**Aktion:**
1. App installieren, DataForSEO-Key + Anthropic-Key in Settings.
2. Daten aus SEMrush exportieren (Teil 1.1).
3. Eine Woche parallel arbeiten — alle Standardabfragen einmal in der App
   wiederholen, Resultate vergleichen.
4. SEMrush downgrade von Pro/Guru auf Free. **Net Save Phase A: ~98 USD/Monat**
   (139 SEMrush − 29 App − ~12 DataForSEO-Verbrauch).

**Was du in dieser Phase noch nicht machen kannst:**
- Detaillierte Backlink-Audits → SEMrush Pro Free (10/Tag) reicht für Sanity-
  Checks; oder warte auf Phase 2.
- Position Tracking → SEMrush Free hat begrenzt 10 Keywords; alternativ
  Google Search Console (kostenlos, eingeschränkter).
- Site Audit → SEMrush Free crawlt 100 Pages/Domain; oder Screaming Frog
  Free (500 URLs).

### Phase B: Backlinks (in 3 Wochenenden)

**Was:** Phase-2-Implementation aus `DATAFORSEO_BACKLINKS_PHASE2.md` +
Filter-Builder + Toxic-Score-Heuristik.

**Voraussetzung:** Backlinks-Modul des DataForSEO-Kontos aktiviert (100 USD
Mindest-Commitment ab dem Monat).

**Aktion:**
1. Implementations-PRs landen (Teil 6 der Backlinks-Phase-2-Doc).
2. Bestehende SEMrush-Backlink-Exporte (Teil 1.1) ggf. importieren.
3. Phase-2-Workflows ein paar Tage parallel testen.
4. SEMrush komplett kündigen, sofern keine Phase-D-Features benötigt.

### Phase C: Position Tracking + On-Page (in ~6 Wochen)

**Was:** Phase-3-Module per `DATAFORSEO_ARCHITECTURE.md` (On-Page) und
SEMrush-Parity-Plan Teil 5 Tier 3 (Position Tracking).

**Aktion:**
1. Implementation.
2. Position-Tracking-History aus SEMrush importieren (CSV pro Keyword).
3. SEMrush Business-Tier abbestellen, falls noch aktiv.

### Phase D (optional): Behalten was du brauchst

**Wenn Traffic Analytics oder Social Toolkit kritisch ist:**
- SEMrush Pro behalten **nur für die zwei Module** und alles andere migrieren.
- Oder SimilarWeb-Subscription parallel (~100 USD/Monat) statt SEMrush.

**Wenn Brand Monitoring kritisch ist:**
- Mention.com, Brandwatch, Talkwalker — bessere fokussierte Tools, oft
  günstiger als SEMrush-Subscription für genau diesen Zweck.

---

## Teil 4: Konkrete Export-Anleitung pro SEMrush-Modul

Schritt-für-Schritt, was du heute in SEMrush klicken solltest:

### Keyword Magic Tool

1. Pro relevantem Seed: „Export to CSV" mit „Volume", „KD%", „CPC",
   „Competitive Density", „Trend".
2. Datei nennt sich `semrush-keywords-{seed}-{datum}.csv`.
3. App-Import (Phase A): bis CSV-Import gebaut ist, paste in
   /keywords/volume manuell — nach 30-Tage-Cache-TTL ist der Re-Fetch
   gratis.

### Domain Overview

1. Domain eingeben → „Organic Research" Tab.
2. „Positions" → Filter auf Position 1–100 → Export.
3. Felder: Keyword, Position, Search Volume, KD, CPC, Traffic, URL.
4. App-Import (Phase A): paste die Keyword-Liste in /keywords/volume um
   die Volumen zu cachen, dann benutze /domain für eigene Calls.

### Backlink Analytics

1. „Backlinks" → Filter auf „Active" + „Follow=Yes" → Export Top 10000.
2. „Anchors" → Export ganze Tabelle.
3. „Referring Domains" → Export Top 1000.
4. App-Import (Phase B): Backlinks-Modul wird CSV-Import direkt
   unterstützen.

### Position Tracking

1. Projekt öffnen → „Overview" → Datum-Range setzen (max 12 Monate).
2. „Export" → CSV.
3. Felder: Keyword, Date, Position, URL, Volume, Visibility.
4. App-Import (Phase C): Position-Tracking-Modul wird Import unterstützen.

### Site Audit

1. Projekt öffnen → „Issues" Tab.
2. Pro Issue-Type → Export (CSV mit URL + Issue-Typ + Severity).
3. App-Import (Phase C): On-Page-Modul wird die Issue-Liste neben dem
   eigenen Audit anzeigen.

### Listen / Lists

1. „My Workspace" → Listen.
2. Pro Liste → Export CSV (Keyword + Tags).
3. App-Import (Phase A): paste in /keywords/volume oder /compare.

---

## Teil 5: Was die App heute schon BESSER kann als SEMrush

Damit der Switch nicht nur „gleichwertig billiger" ist:

1. **Cost-Transparency.** Jeder Call zeigt die exakten USD-Kosten vor und
   nach Ausführung (Volume-Tab + /usage). SEMrush versteckt Verbrauch
   hinter Limit-Counters.
2. **AI-Chat über jeden Datensatz.** „Cluster meine 1000 Keywords" oder
   „welche Blog-Themen passen zu meinen Top-50-Rankings" — keine
   SEMrush-Funktion, weder als Add-on noch im Enterprise-Tier (Stand
   Mai 2026).
3. **Export jeder Tabelle als CSV/JSON.** SEMrush-Export ist auf bestimmte
   Module beschränkt und manchmal limitiert.
4. **Local-First.** Daten in DuckDB lokal, kein Vendor-Lockin. SEMrush
   ist Cloud-zentriert.
5. **Multi-Provider AI** (Anthropic + OpenAI, ggf. später Ollama). Wechsel
   ohne Re-Setup.
6. **Markdown-Export von Chat-Sessions.** Für Mandanten-Dokumentation
   direkt verwendbar.

---

## Teil 6: Risiken / Was du beachten solltest

1. **DataForSEO-Datenqualität ≠ SEMrush.** Bei Volumen +/- 20% Abweichung
   ist normal. Bei Backlinks deckt DataForSEO einen großen Pool, aber
   nicht denselben wie SEMrush. **Empfehlung:** Erste 4 Wochen parallel
   fahren, Stichproben vergleichen.
2. **Keine offiziellen Mandanten-Reports.** Falls du PDF-Reports an
   Kunden lieferst: aktuell App-CSV-Export + AI-Chat-Zusammenfassung +
   manuelles PDF-Erstellen. Native PDF-Reports sind Phase-4-Roadmap.
3. **Kein Mandantenschalter.** Aktuell single-user; Multi-Tenant ist
   im Architektur-Doc Teil 13.5 als Phase-4-Feature dokumentiert.
4. **Kein Rank-Tracking-Verlauf vor App-Installation.** SEMrush-History
   exportieren, aber Re-Berechnung von „Visibility Score über 12 Monate"
   ist erst möglich nach Phase-C-Implementierung + Import.

---

## Teil 7: Was als Nächstes konkret zu tun ist

1. **Heute (1 h):** SEMrush-CSV-Exporte pro Modul aus Teil 4 ziehen.
   Lege sie in einem `semrush-archive/`-Ordner ab.
2. **Heute (30 min):** App installieren, Provider-Keys konfigurieren,
   eine Volume-Abfrage durchführen, AI-Chat einmal benutzen.
3. **Diese Woche:** SEMrush von Pro auf Free downgraden, sofern Phase A
   ausreicht. **Sofort -110 USD/Monat.**
4. **Nächste 2 Wochen:** Phase B Backlinks-Implementation einplanen
   (siehe Backlinks-Phase-2-Doc).
5. **Nächsten Monat:** Phase C Position Tracking + On-Page einplanen.
6. **Nach Phase C:** SEMrush komplett kündigen oder auf Free belassen.

---

## Teil 8: Zusammenfassung — der eine Satz

Wenn du SEMrush kündigst und auf den App-Stack switchst, sparst du als
typischer Pro-User (heute 139 USD/Monat) ~98 USD/Monat ab Tag 1
(Phase A), ~83 USD/Monat ab Phase B, und ~70 USD/Monat ab Phase C —
DataForSEO-Verbrauch in jeder Phase eingerechnet, vorausgesetzt du
nutzt nicht aktiv Traffic Analytics, Social Toolkit, oder PPC Display
Network, für die DataForSEO kein Pendant hat.
