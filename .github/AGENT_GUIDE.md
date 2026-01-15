# AI-Agent System - Benutzerhandbuch

## Übersicht

Das AI-Agent-System ermöglicht es, automatisch AI-Assistenten zu Issues und Pull Requests zuzuweisen, die dann bei der Bearbeitung helfen können.

## Verfügbare Agents

### 🤖 @codex
**Spezialisierung**: Code-Generierung und technische Lösungen

**Best geeignet für**:
- Implementierung neuer Funktionen
- Code-Refactoring
- Bug-Fixes mit klarem technischen Kontext
- API-Entwicklung
- Technische Dokumentation

**Beispiel-Verwendung**:
```
@codex bitte implementiere eine REST API für User-Authentifizierung mit JWT-Tokens
```

### 🚁 @copilot
**Spezialisierung**: Code-Entwicklung und Problem-Lösung

**Best geeignet für**:
- Code-Reviews
- Debugging komplexer Probleme
- Testing und Test-Automatisierung
- Best Practices und Code-Qualität
- Allgemeine Code-Entwicklung

**Beispiel-Verwendung**:
```
@copilot kannst du diesen Bug analysieren und einen Fix vorschlagen?
```

### ✨ @gemini
**Spezialisierung**: Fortgeschrittene Analyse und kreative Lösungsansätze

**Best geeignet für**:
- Architektur-Design und System-Planung
- Komplexe Datenanalyse
- Strategische Entscheidungen
- Multi-modale Aufgaben (Text, Bilder, etc.)
- Kreative Problemlösung

**Beispiel-Verwendung**:
```
@gemini analysiere bitte die aktuelle Architektur und schlage Optimierungen vor
```

## Verwendung

### Methode 1: Direkte Erwähnung (Empfohlen)

Erwähne einen Agent einfach in der Issue-Beschreibung oder in einem Kommentar:

```markdown
### Problem
Die Login-Funktion ist zu langsam.

@copilot kannst du das Performance-Problem analysieren und Optimierungen vorschlagen?
```

### Methode 2: Dropdown-Auswahl

Beim Erstellen eines Issues kannst du im Dropdown-Feld "AI-Agent" einen Agent auswählen.

### Methode 3: Manuelle Zuweisung

Über GitHub Actions → Agent Task Manager kannst du einen Agent manuell zuweisen.

## Was passiert nach der Erwähnung?

1. **Sofortige Reaktion** 🚀
   - Der Agent reagiert mit einem Rocket-Emoji auf deine Erwähnung
   - Dies zeigt, dass die Erwähnung erkannt wurde

2. **Bestätigungs-Kommentar**
   - Der Agent erstellt einen Kommentar mit Details zu seinen Fähigkeiten
   - Der Agent bestätigt die Übernahme der Aufgabe

3. **Label-Tracking**
   - Ein Label wird hinzugefügt (z.B. `agent:codex`)
   - Dies ermöglicht einfaches Filtern und Tracking

4. **Weitere Schritte**
   - Je nach Integration können weitere automatische Aktionen folgen
   - Der Agent wird in zukünftigen Updates über Fortschritte informieren

## Best Practices

### ✅ DO's

- **Sei spezifisch**: Beschreibe klar, was du brauchst
  ```
  @codex implementiere eine User-Authentifizierung mit email/password und JWT
  ```

- **Wähle den richtigen Agent**: Nutze den Agent, der am besten zur Aufgabe passt
  - Codex für Implementierungen
  - Copilot für Code-Review und Debugging
  - Gemini für Analyse und Design

- **Gib Kontext**: Füge relevante Informationen hinzu
  ```
  @copilot dieser Bug tritt nur in Production auf. Siehe Logs in Kommentar #5
  ```

- **Ein Agent pro Issue**: Fokussiere auf einen Agent zur klaren Verantwortlichkeit

### ❌ DON'Ts

- **Nicht mehrere Agents gleichzeitig**: Vermeide Verwirrung
  ```
  ❌ @codex @copilot @gemini macht mal was hier
  ```

- **Nicht zu vage**: Sei konkret in deinen Anfragen
  ```
  ❌ @copilot fix alles
  ✅ @copilot behebe den Null-Pointer-Error in der User-Service Klasse
  ```

- **Nicht für jede Kleinigkeit**: Nutze Agents für substanzielle Aufgaben
  ```
  ❌ @codex ändere den Button-Text zu "Speichern"
  ```

## Tracking und Status

### Issue-Labels

Nach der Agent-Zuweisung werden automatisch Labels hinzugefügt:

- `agent:codex` - Wird von Codex bearbeitet
- `agent:copilot` - Wird von Copilot bearbeitet
- `agent:gemini` - Wird von Gemini bearbeitet
- `agent-assigned` - Generisches Label für Agent-Zuweisung
- `agent-completed` - Agent hat die Aufgabe abgeschlossen

### Status-Abfrage

Du kannst den Status einer Agent-Zuweisung jederzeit abfragen:

1. Gehe zu **Actions** → **Agent Task Manager**
2. Klicke auf **Run workflow**
3. Wähle:
   - Agent: Der zugewiesene Agent
   - Issue Number: Die Issue-Nummer
   - Action: `status`

## Erweiterte Funktionen

### Agent-Abschluss

Wenn ein Agent seine Arbeit abgeschlossen hat:

1. Gehe zu **Actions** → **Agent Task Manager**
2. Wähle Action: `complete`
3. Das `agent:*` Label wird entfernt
4. Ein `agent-completed` Label wird hinzugefügt

### Multi-Issue-Tracking

Du kannst alle von einem bestimmten Agent bearbeiteten Issues finden:

```
is:issue label:agent:codex
```

Oder alle abgeschlossenen Agent-Tasks:

```
is:issue label:agent-completed
```

## Fehlerbehebung

### Agent reagiert nicht?

1. **Prüfe die Schreibweise**: `@codex` nicht `@Codex` oder `@CODEX`
2. **Prüfe die Workflow-Logs**: Actions → Agent Dispatcher
3. **Prüfe Permissions**: Das Repository benötigt Workflow-Permissions für Issues

### Falscher Agent zugewiesen?

1. Erwähne den richtigen Agent in einem neuen Kommentar
2. Oder nutze den Agent Task Manager zur manuellen Neuzuweisung
3. Entferne das alte `agent:*` Label manuell

### Agent-Label fehlt?

Die Labels werden automatisch erstellt. Falls sie fehlen:
1. Der Workflow erstellt sie beim ersten Gebrauch
2. Prüfe die Workflow-Logs für Fehler
3. Labels können auch manuell im Repository erstellt werden

## Konfiguration

Die Agent-Konfiguration befindet sich in `.github/agent-config.yml`.

Dort können:
- Neue Agents hinzugefügt werden
- Agent-Eigenschaften angepasst werden
- Farben und Icons geändert werden

## Support

Bei Fragen oder Problemen:
1. Erstelle ein Issue mit dem Label `agent-system`
2. Beschreibe das Problem detailliert
3. Füge Screenshots und Logs bei

## Roadmap

Geplante Funktionen:
- [ ] Automatische Code-Generierung durch Agents
- [ ] Integration mit PR-Reviews
- [ ] Agent-Metriken und Statistiken
- [ ] Prioritäts-basierte Agent-Zuweisung
- [ ] Agent-Collaboration bei komplexen Tasks
- [ ] Webhook-Integration für externe Tools
