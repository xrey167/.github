# Agent System - Beispiele und Szenarien

## Szenario 1: Bug Fix mit @copilot

### Initial Issue
```markdown
Titel: [BUG] Login schlägt mit 500 Error fehl

Beschreibung:
Nach dem letzten Update schlägt der Login für bestimmte User fehl.

**Error Log:**
```
TypeError: Cannot read property 'email' of undefined
  at UserService.authenticate (user.service.js:45)
```

**Erwartetes Verhalten:**
Login sollte erfolgreich sein

**Schritte zur Reproduktion:**
1. Öffne Login-Seite
2. Gebe Email: test@example.com ein
3. Gebe Passwort ein
4. Klicke Login
5. → Error 500

@copilot kannst du diesen Bug analysieren und einen Fix vorschlagen?
```

### Agent Reaktion
1. 🚀 Copilot reagiert mit Rocket-Emoji
2. Kommentar wird erstellt:
   ```
   🚁 **Copilot Agent aktiviert!**
   
   Ich bin GitHub Copilot und werde diese Aufgabe bearbeiten. 
   Ich helfe bei der Code-Entwicklung und Problem-Lösung.
   
   *Starte Aufgabenanalyse...*
   ```
3. Label `agent:copilot` wird hinzugefügt

## Szenario 2: Feature Implementation mit @codex

### Feature Request
```markdown
Titel: [FEATURE] User Profile mit Avatar Upload

Beschreibung:
User sollen ein Profil-Bild hochladen können.

**Requirements:**
- Max 5MB
- JPG/PNG Format
- Automatische Größenanpassung zu 200x200px
- Secure storage

**Akzeptanzkriterien:**
- [ ] User kann Bild hochladen
- [ ] Bild wird validiert
- [ ] Thumbnail wird generiert
- [ ] Bild wird in S3 gespeichert

@codex bitte implementiere diese Feature mit Node.js und Sharp für Bildverarbeitung
```

### Agent Reaktion
1. 🚀 Codex reagiert mit Rocket-Emoji
2. Kommentar:
   ```
   🤖 **Codex Agent aktiviert!**
   
   Ich bin Codex und werde diese Aufgabe analysieren. 
   Ich spezialisiere mich auf Code-Generierung und technische Lösungen.
   
   *Analysiere die Anforderungen...*
   ```
3. Label `agent:codex` wird hinzugefügt

## Szenario 3: Architektur Review mit @gemini

### Architecture Discussion
```markdown
Titel: [TASK] Microservices Architektur evaluieren

Beschreibung:
Wir überlegen, von Monolith zu Microservices zu migrieren.

**Kontext:**
- Aktuelle App: Node.js Monolith
- Team-Größe: 5 Entwickler
- Traffic: ~10k req/day
- Hauptprobleme: Deployment-Geschwindigkeit, Skalierung

**Fragen:**
1. Macht Microservices für uns Sinn?
2. Welche Services sollten wir aufteilen?
3. Was sind die Risiken?
4. Wie sieht die Migration aus?

@gemini kannst du eine Analyse durchführen und Empfehlungen geben?
```

### Agent Reaktion
1. 🚀 Gemini reagiert mit Rocket-Emoji
2. Kommentar:
   ```
   ✨ **Gemini Agent aktiviert!**
   
   Ich bin Gemini und werde diese Aufgabe übernehmen. 
   Ich biete fortgeschrittene Analyse und kreative Lösungsansätze.
   
   *Beginne mit der Analyse...*
   ```
3. Label `agent:gemini` wird hinzugefügt

## Szenario 4: Follow-up Kommentar

### Nachfrage im laufenden Issue
```markdown
User Kommentar:
@copilot der vorgeschlagene Fix funktioniert, aber jetzt gibt es ein 
neues Problem mit der Session-Verwaltung. Kannst du auch das checken?
```

### Agent Reaktion
1. 🚀 Copilot reagiert auf den Kommentar
2. Neuer Kommentar wird erstellt (falls noch nicht zugewiesen)
3. Bestehendes Label bleibt erhalten

## Szenario 5: Manuelle Agent-Zuweisung

### Via GitHub Actions UI

**Schritte:**
1. Gehe zu **Actions** Tab
2. Wähle **Agent Task Manager**
3. Klicke **Run workflow**
4. Fülle aus:
   - Agent: `copilot`
   - Issue Number: `42`
   - Action: `assign`
5. Klicke **Run workflow**

**Resultat:**
- Kommentar wird in Issue #42 erstellt
- Labels werden hinzugefügt
- Agent ist zugewiesen

## Szenario 6: Agent-Arbeit abschließen

### Via GitHub Actions UI

**Schritte:**
1. Gehe zu **Actions** Tab
2. Wähle **Agent Task Manager**
3. Klicke **Run workflow**
4. Fülle aus:
   - Agent: `codex`
   - Issue Number: `15`
   - Action: `complete`
5. Klicke **Run workflow**

**Resultat:**
- Abschluss-Kommentar wird erstellt:
  ```
  🤖 **Codex Agent - Aufgabe abgeschlossen** ✅
  
  Die Aufgabe wurde erfolgreich bearbeitet.
  ```
- Label `agent:codex` wird entfernt
- Label `agent-completed` wird hinzugefügt

## Szenario 7: Status-Abfrage

### Via GitHub Actions UI

**Schritte:**
1. Gehe zu **Actions** Tab
2. Wähle **Agent Task Manager**
3. Klicke **Run workflow**
4. Fülle aus:
   - Agent: `gemini`
   - Issue Number: `23`
   - Action: `status`
5. Klicke **Run workflow**

**Resultat:**
- Status-Kommentar wird erstellt:
  ```
  **Agent Status Check**
  
  ✨ Agent ist aktiv zugewiesen
  ```

## Szenario 8: Dropdown-Auswahl beim Issue-Erstellen

### Beim Erstellen eines neuen Task Issues

**Schritte:**
1. Gehe zu **Issues** → **New Issue**
2. Wähle Template: **📋 Task**
3. Fülle Felder aus
4. Bei "AI-Agent" Dropdown:
   - Wähle: `@codex - Code-Generierung & technische Lösungen`
5. Erstelle Issue

**Wichtig:** 
Die Dropdown-Auswahl allein triggert den Workflow nicht automatisch. 
Du musst den Agent trotzdem im Text erwähnen, z.B.:

```markdown
## Ziel
Implementiere die Payment-Integration

@codex bitte übernimm diese Implementierung
```

Der Dropdown dient als:
- Erinnerung, dass Agents verfügbar sind
- Dokumentation der Agent-Wahl
- Visueller Hinweis für andere Team-Mitglieder

## Best Practices aus den Szenarien

### ✅ Gute Beispiele

```markdown
@codex implementiere User-Authentifizierung mit:
- Email/Password Login
- JWT Tokens
- Password Reset Flow
- Email Verification

Tech Stack: Node.js, Express, PostgreSQL
```

```markdown
@copilot der Bug tritt nur auf wenn:
1. User ist nicht admin
2. Request kommt von Mobile App
3. Zeitzone ist nicht UTC

Siehe Logs in Kommentar #3 und Stack Trace in Kommentar #7
```

```markdown
@gemini evaluiere folgende Architektur-Optionen:
1. Microservices mit K8s
2. Serverless mit AWS Lambda
3. Hybrid Approach

Kontext: 10k DAU, EU Datenschutz, 5 Dev Team
```

### ❌ Schlechte Beispiele

```markdown
❌ @codex @copilot @gemini macht mal
→ Zu viele Agents, keine klare Verantwortung
```

```markdown
❌ @copilot fix
→ Zu vage, kein Kontext
```

```markdown
❌ @gemini ändere Farbe des Buttons zu Blau
→ Triviale Aufgabe, kein Agent nötig
```

## Tracking und Filtering

### Alle offenen Issues mit Agents
```
is:issue is:open label:agent:codex
is:issue is:open label:agent:copilot  
is:issue is:open label:agent:gemini
```

### Alle von Agents abgeschlossenen Tasks
```
is:issue is:closed label:agent-completed
```

### Alle Issues, die auf einen Agent warten
```
is:issue is:open label:agent-assigned
```

### Kombination
```
is:issue is:open label:bug label:agent:copilot
```

## Integration mit Projekt-Workflow

### Workflow-Beispiel

1. **Issue Creation**
   - User erstellt Bug Report
   - Wählt Severity: High
   - Erwähnt `@copilot` für schnelle Analyse

2. **Agent Response**
   - Copilot reagiert und bestätigt
   - Label `agent:copilot` wird hinzugefügt
   - Team wird benachrichtigt

3. **Entwicklung**
   - Agent (oder Team-Mitglied) arbeitet an Fix
   - Updates werden als Kommentare gepostet

4. **Completion**
   - Fix wird deployed
   - Agent Task Manager → Complete
   - Label wechselt zu `agent-completed`
   - Issue wird geschlossen

5. **Review**
   - Team kann alle `agent-completed` Issues reviewen
   - Metriken und Erfolgsrate tracken
