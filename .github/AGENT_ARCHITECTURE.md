# Agent System - Architektur und Workflow

## System-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Issue      │  │   Comment    │  │    PR        │     │
│  │              │  │              │  │              │     │
│  │  @codex      │  │  @copilot    │  │  @gemini     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │   GitHub Actions Trigger       │
            │   - issues (opened, edited)    │
            │   - issue_comment (created)    │
            └────────────┬───────────────────┘
                         │
                         ▼
            ┌────────────────────────────────┐
            │   Agent Dispatcher Workflow    │
            │                                │
            │   1. Detect Agent Mention      │
            │   2. Validate Agent Name       │
            │   3. Extract Context           │
            └────────────┬───────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐     ┌─────────┐    ┌─────────┐
    │ @codex │     │@copilot │    │ @gemini │
    │   🤖   │     │   🚁    │    │   ✨    │
    └───┬────┘     └────┬────┘    └────┬────┘
        │               │              │
        └───────────────┴──────────────┘
                        │
                        ▼
            ┌───────────────────────────┐
            │   Agent Actions           │
            │                           │
            │   1. Add Reaction 🚀      │
            │   2. Post Comment         │
            │   3. Add Label            │
            │   4. (Future: Execute)    │
            └───────────────────────────┘
```

## Workflow-Details

### 1. Event Detection

```yaml
on:
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created, edited]
```

**Trigger:**
- Neues Issue wird erstellt
- Issue wird bearbeitet
- Kommentar wird erstellt
- Kommentar wird bearbeitet

### 2. Agent Detection Logic

```javascript
// Regex-basierte Erkennung
const mentionPattern = /(@codex|@copilot|@gemini)\b/gi

// Check Issue Body oder Comment Body
let body = context.payload.issue?.body || 
           context.payload.comment?.body

// Ersten erwähnten Agent finden
const match = body.match(mentionPattern)
const agent = match ? match[1].slice(1) : null
```

### 3. Agent Response Flow

```
┌──────────────────┐
│  Agent Detected  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌───────────────┐
│  Add Reaction    │─────▶│    🚀         │
│  to Issue/Comment│      │  (Rocket)     │
└────────┬─────────┘      └───────────────┘
         │
         ▼
┌──────────────────┐      ┌───────────────────────┐
│  Create Comment  │─────▶│  "Agent aktiviert!"   │
│  with Details    │      │  + Capabilities       │
└────────┬─────────┘      └───────────────────────┘
         │
         ▼
┌──────────────────┐      ┌───────────────────┐
│  Add Label       │─────▶│  agent:codex      │
│  (Create if new) │      │  agent:copilot    │
│                  │      │  agent:gemini     │
└──────────────────┘      └───────────────────┘
```

### 4. Label Management

```
Label Creation (First Time):
┌─────────────────────────────────────┐
│  Try: Add Label to Issue            │
└──────────┬──────────────────────────┘
           │
           ▼
     [Label exists?]
           │
    ┌──────┴──────┐
    │             │
   YES           NO
    │             │
    ▼             ▼
  [Done]    ┌──────────────┐
            │ Create Label │
            │ - Name       │
            │ - Color      │
            │ - Description│
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  Add Label   │
            │  to Issue    │
            └──────────────┘
```

## Komponenten-Übersicht

### Workflows

**1. agent-dispatcher.yml**
- **Zweck**: Haupt-Workflow für Agent-Erkennung
- **Trigger**: Issue/Comment Events
- **Jobs**:
  - `detect-agent-mention`: Erkennt @mentions
  - `respond-with-agent`: Reagiert und kommentiert

**2. agent-task-manager.yml**
- **Zweck**: Manuelle Agent-Verwaltung
- **Trigger**: Manual (workflow_dispatch)
- **Actions**:
  - `assign`: Agent manuell zuweisen
  - `complete`: Agent-Aufgabe abschließen
  - `status`: Agent-Status abfragen

### Konfiguration

**agent-config.yml**
- Agent-Definitionen
- Capabilities
- Icons und Farben
- Trigger-Patterns

### Dokumentation

**AGENT_GUIDE.md**
- Umfassende Anleitung
- Best Practices
- Troubleshooting

**AGENT_QUICKREF.md**
- Schnellreferenz
- Übersichtstabelle
- Schnelle Tipps

**AGENT_EXAMPLES.md**
- Praktische Szenarien
- Use Cases
- Beispiel-Workflows

## Datenfluss

```
User Input (@codex)
       │
       ▼
GitHub Event (issue.opened)
       │
       ▼
Workflow Trigger
       │
       ▼
GitHub Actions (Ubuntu Runner)
       │
       ├─▶ Detect Mention (JavaScript)
       │   │
       │   ├─▶ Parse Body Text
       │   ├─▶ Match Regex Pattern
       │   └─▶ Output: agent="codex"
       │
       ▼
Response Job (If agent detected)
       │
       ├─▶ GitHub API: Add Reaction
       ├─▶ GitHub API: Create Comment
       └─▶ GitHub API: Add/Create Label
```

## Permissions

```yaml
permissions:
  issues: write      # Kommentare & Labels
  contents: read     # Repository lesen
```

**Erforderlich für:**
- Issue-Kommentare erstellen
- Labels erstellen/hinzufügen
- Reaktionen hinzufügen
- Issue-Details lesen

## Erweiterbarkeit

### Neue Agents hinzufügen

1. **agent-config.yml**:
```yaml
agents:
  newagent:
    name: "New Agent"
    icon: "🆕"
    color: "FF0000"
    trigger: "@newagent"
```

2. **agent-dispatcher.yml**:
```javascript
const supportedAgents = ['codex', 'copilot', 'gemini', 'newagent'];
```

3. **Dokumentation aktualisieren**

### Integration mit externen Services

```yaml
# Beispiel: Webhook an externe API
- name: Notify external service
  run: |
    curl -X POST https://api.example.com/agent-assigned \
      -H "Content-Type: application/json" \
      -d '{"agent": "${{ needs.detect.outputs.agent }}", 
           "issue": "${{ github.event.issue.number }}"}'
```

### Erweiterte Aktionen

```yaml
# Beispiel: Auto-Assign zu Projekt-Board
- name: Add to project
  uses: actions/add-to-project@v0.5.0
  with:
    project-url: https://github.com/orgs/ORG/projects/1
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Sicherheit

### Rate Limiting
- GitHub Actions: 1000 API requests/hour
- Webhook Events: Unbegrenzt, aber throttled

### Secrets Management
- `GITHUB_TOKEN`: Automatisch bereitgestellt
- Scope: Nur Repository-Access
- Keine custom secrets erforderlich

### Validierung
- Agent-Namen werden gegen Whitelist geprüft
- Nur unterstützte Agents werden aktiviert
- XSS-Schutz durch GitHub's Markdown-Rendering

## Metriken und Monitoring

### Verfügbare Metriken

```
Query: is:issue label:agent:codex
→ Alle von Codex bearbeiteten Issues

Query: is:issue label:agent-completed created:>2024-01-01
→ Alle abgeschlossenen Agent-Tasks seit Datum

Query: is:issue is:open label:agent-assigned
→ Aktive Agent-Zuweisungen
```

### Workflow-Logs

```
Actions → Agent Dispatcher → Workflow Run
→ Zeigt Logs für Debugging
→ Sichtbar: Detection, API-Calls, Errors
```

## Troubleshooting

### Debug-Checklist

```
□ Workflow-Datei ist in .github/workflows/
□ Syntax ist valide (YAML Parser)
□ Permissions sind korrekt gesetzt
□ Agent-Name ist in supportedAgents[]
□ @mention ist korrekt formatiert
□ Repository hat Actions aktiviert
□ Workflow-Logs für Fehler prüfen
```

### Häufige Probleme

**Problem**: Agent reagiert nicht
- **Check**: Workflow-Logs in Actions
- **Check**: Agent-Name Schreibweise
- **Check**: Repository Permissions

**Problem**: Label-Fehler
- **Lösung**: Labels werden automatisch erstellt
- **Check**: Organization-Settings für Label-Permissions

**Problem**: Mehrere Agents erwähnt
- **Verhalten**: Nur erster Agent wird aktiviert
- **Lösung**: Ein Agent pro Issue bevorzugen

## Future Enhancements

### Geplant

1. **Automatische Code-Generierung**
   - Agent erstellt Pull Request
   - Code wird direkt committed
   - Auto-Tests werden ausgeführt

2. **Agent Collaboration**
   - Mehrere Agents arbeiten zusammen
   - Koordinierte Workflows
   - Aufgaben-Aufteilung

3. **Priority Queue**
   - Agent-Warteschlange
   - Prioritäts-basierte Abarbeitung
   - Load Balancing

4. **AI Integration**
   - Echte AI-Modelle (OpenAI, etc.)
   - Automatische Antworten
   - Code-Generation

5. **Analytics Dashboard**
   - Agent-Performance
   - Response Times
   - Success Rates
