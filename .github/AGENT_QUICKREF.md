# 🤖 AI-Agent Quick Reference

## Schnellübersicht

| Agent | Icon | Trigger | Best für | Farbe |
|-------|------|---------|----------|-------|
| Codex | 🤖 | `@codex` | Code-Generierung, Bug-Fixes, APIs | 🟢 Grün |
| Copilot | 🚁 | `@copilot` | Code-Review, Debugging, Testing | 🔵 Blau |
| Gemini | ✨ | `@gemini` | Analyse, Design, Strategie | 🟠 Orange |

## Verwendung

```markdown
@codex implementiere die User-Authentifizierung
```

```markdown
@copilot analysiere diesen Bug und schlage einen Fix vor
```

```markdown
@gemini bewerte die aktuelle Architektur
```

## Was passiert?

1. 🚀 Agent reagiert mit Emoji
2. 💬 Agent erstellt Bestätigungs-Kommentar
3. 🏷️ Label `agent:name` wird hinzugefügt

## Wann welcher Agent?

### 🤖 @codex
- ✅ Neue Features implementieren
- ✅ Code schreiben/refactoren
- ✅ APIs entwickeln
- ✅ Technische Dokumentation

### 🚁 @copilot  
- ✅ Code reviewen
- ✅ Bugs debuggen
- ✅ Tests schreiben
- ✅ Best Practices anwenden

### ✨ @gemini
- ✅ System-Design
- ✅ Komplexe Analyse
- ✅ Strategische Planung
- ✅ Kreative Lösungen

## Tipps

💡 **Sei spezifisch** - "Implementiere X mit Y" statt "Mach was"  
💡 **Ein Agent pro Issue** - Fokus auf klare Verantwortlichkeit  
💡 **Gib Kontext** - Links, Logs, Screenshots helfen  
💡 **Richtige Wahl** - Passenden Agent für die Aufgabe wählen

## Tracking

Finde alle Issues eines Agents:
```
is:issue label:agent:codex
```

Finde abgeschlossene Agent-Tasks:
```
is:issue label:agent-completed
```

## Mehr Infos

📚 Siehe [AGENT_GUIDE.md](AGENT_GUIDE.md) für Details
