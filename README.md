# .github

Community Health Files & Agent System für xrey167

## Übersicht

Dieses Repository enthält die Standard-Community-Health-Dateien und das AI-Agent-System für alle Repositories der Organisation.

## 📋 Issue Templates

Das Repository bietet verschiedene Issue-Templates für:
- 🐛 Bug Reports
- ✨ Feature Requests  
- 📋 Tasks
- 📊 Data Issues
- 🔌 Integration Requests
- 📈 Trading Strategies

## 🤖 AI-Agent-System

### Verfügbare Agents

Dieses Repository implementiert ein automatisches Agent-Tagging-System. Du kannst AI-Agenten in Issues und Kommentaren erwähnen, die dann automatisch reagieren und Aufgaben übernehmen.

#### @codex 🤖
- **Spezialisierung**: Code-Generierung und technische Lösungen
- **Fähigkeiten**: 
  - Code-Generierung
  - Bug-Fixes
  - Code-Refactoring
  - Technische Dokumentation
  - API-Entwicklung

#### @copilot 🚁
- **Spezialisierung**: Code-Entwicklung und Problem-Lösung
- **Fähigkeiten**:
  - Code-Entwicklung
  - Code-Review
  - Testing
  - Debugging
  - Best Practices

#### @gemini ✨
- **Spezialisierung**: Fortgeschrittene Analyse und kreative Lösungsansätze
- **Fähigkeiten**:
  - Komplexe Analyse
  - Architektur-Design
  - Strategische Planung
  - Kreative Lösungen
  - Multi-modale Aufgaben

### Verwendung

Erwähne einfach einen Agent in einem Issue oder Kommentar:

```markdown
@codex kannst du bitte die Login-Funktion implementieren?
```

```markdown
@copilot dieser Bug muss dringend gefixt werden, siehe Stack Trace oben
```

```markdown
@gemini analysiere bitte die Architektur und schlage Verbesserungen vor
```

### Was passiert dann?

1. **Automatische Reaktion** 🚀: Der Agent reagiert mit einem Emoji auf deine Erwähnung
2. **Bestätigung**: Der Agent erstellt einen Kommentar, um die Aufgabe zu bestätigen
3. **Tracking**: Ein Label (z.B. `agent:codex`) wird hinzugefügt, um den Fortschritt zu verfolgen

### Manuelles Agent-Management

Du kannst Agents auch manuell über Workflow-Dispatches zuweisen:

1. Gehe zu **Actions** → **Agent Task Manager**
2. Klicke auf **Run workflow**
3. Wähle den Agent, die Issue-Nummer und die Aktion aus

## 📚 Weitere Ressourcen

- [GitHub Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🔧 Konfiguration

Die Agent-Konfiguration befindet sich in `.github/agent-config.yml`. Dort können neue Agents hinzugefügt oder bestehende angepasst werden.
