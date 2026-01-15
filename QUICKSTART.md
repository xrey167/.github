# Quick Start Guide - GitHub Best Practices Template

Schneller Einstieg in die Nutzung dieses Best-Practice-Templates.

## 🚀 5-Minuten Setup

### 1. Template verwenden

**Option A: Als GitHub Template**
```bash
# 1. Klicke "Use this template" auf GitHub
# 2. Wähle Repository-Name
# 3. Erstelle Repository
```

**Option B: Manuell kopieren**
```bash
# Clone dieses Repository
git clone https://github.com/xrey167/.github.git template

# Kopiere in dein Projekt
cp -r template/.github /pfad/zu/deinem/projekt/
```

### 2. Anpassen

```bash
cd dein-projekt/.github

# CODEOWNERS anpassen
nano CODEOWNERS
# Ersetze @team-names mit deinen Teams/Usernamen

# README anpassen
nano README.md
# Update Projekt-spezifische Informationen

# SECURITY.md anpassen
nano SECURITY.md
# Ersetze security@example.com mit deiner Email
```

### 3. Labels erstellen

```bash
# Via GitHub CLI
gh label create "priority:critical" --color d73a4a --description "🔴 Critical"
gh label create "priority:high" --color ff9800 --description "🟠 High"
gh label create "priority:medium" --color ffc107 --description "🟡 Medium"
gh label create "priority:low" --color 4caf50 --description "🟢 Low"

# Oder nutze das Script in LABELS.md
```

### 4. Branch Protection aktivieren

```bash
# Via GitHub UI:
# Settings → Branches → Add rule

# Für "main":
✅ Require pull request reviews (2 approvals)
✅ Require status checks to pass
✅ Require conversation resolution
❌ Allow force pushes
❌ Allow deletions
```

### 5. Erstes Issue erstellen

```bash
# Via GitHub UI:
# Issues → New Issue → Template wählen

# Via CLI:
gh issue create --title "[TASK] Setup Project" --label task
```

## 📊 GitHub Projects Setup

### Schnelles Kanban Board

1. **Projects** → **New Project**
2. Template: **Board**
3. Spalten:
   - 📥 Backlog
   - 📋 To Do
   - 🏗️ In Progress
   - 👀 In Review
   - ✅ Done

4. **Automation** aktivieren:
   - Issues → Backlog
   - PR opened → In Review
   - PR merged → Done

## 🔄 Workflow Übersicht

### Für Entwickler

```bash
# 1. Issue erstellen/auswählen
gh issue create

# 2. Branch erstellen
git checkout -b feature/123-my-feature

# 3. Entwickeln & Committen
git add .
git commit -m "feat: Add my feature (#123)"

# 4. Push & PR erstellen
git push origin feature/123-my-feature
gh pr create --fill

# 5. Warten auf Review
# 6. Merge nach Approval
```

### Für Reviewer

```bash
# 1. PR checken
gh pr list
gh pr checkout 123

# 2. Code reviewen
# 3. Kommentare/Approve
gh pr review 123 --approve

# 4. Merge
gh pr merge 123 --squash
```

## 🤖 Automatisierung

### Issue Commands

In Issue-Kommentaren:
```
/assign @username       → Zuweisung
/label bug             → Label hinzufügen
/priority high         → Priorität setzen
/close                 → Issue schließen
```

### PR Auto-Checks

Automatisch bei PR-Erstellung:
- ✅ Titel-Format validieren
- ✅ Linked Issues prüfen
- ✅ PR-Größe checken
- ✅ Review-Checkliste posten
- ✅ Labels zuweisen

## 📝 Templates im Überblick

### Issue Templates

| Template | Wann verwenden? |
|----------|-----------------|
| 🐛 Bug Report | Fehler melden |
| ✨ Feature Request | Neue Funktion vorschlagen |
| 📋 Task | Entwicklungsaufgabe |
| 📊 Data Issue | Datenqualität-Probleme |
| 🔌 Integration Request | API-Anbindungen |
| 📈 Trading Strategy | Trading-Strategien |

### PR Template

Automatisch bei jedem PR:
- Beschreibung & Ziel
- Verknüpfte Issues
- Art der Änderung
- Testing-Checkliste
- Review-Checkliste

## 🏷️ Label-System

### Empfohlene Kombination

**Für Issues:**
```
Type + Priority + Area (optional)

Beispiele:
- bug, priority:high, area:backend
- feature, priority:medium, area:frontend
- task, priority:low, area:devops
```

**Für PRs:**
```
Type + Size (automatisch) + Area (automatisch)

Beispiele:
- feature, size:M, area:backend
- bugfix, size:S, area:frontend
```

## 🔒 Security Best Practices

### Wichtigste Checks

```bash
# 1. Keine Secrets committen
git secrets --scan

# 2. Dependencies checken
npm audit
npm audit fix

# 3. Branch Protection aktiviert?
gh api repos/:owner/:repo/branches/main/protection

# 4. 2FA aktiviert?
# GitHub Settings → Security → Two-factor authentication
```

## 📚 Weitere Ressourcen

### Dokumentation

- 📖 [README.md](README.md) - Vollständige Übersicht
- 🌿 [BRANCH_PROTECTION.md](BRANCH_PROTECTION.md) - Branch Protection Rules
- 📊 [PROJECTS_SETUP.md](PROJECTS_SETUP.md) - GitHub Projects
- 🏷️ [LABELS.md](LABELS.md) - Label-Konfiguration
- 🤝 [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution Guidelines
- 🔒 [SECURITY.md](SECURITY.md) - Security Policy

### GitHub Actions

- 🔍 [pr-checks.yml](workflows/pr-checks.yml) - PR Validierung
- 📋 [issue-management.yml](workflows/issue-management.yml) - Issue Automation
- 🏷️ [auto-label.yml](workflows/auto-label.yml) - Auto-Labeling
- ⏰ [stale.yml](workflows/stale.yml) - Stale Issues

## 🎯 Checkliste: Erstes Setup

- [ ] Template kopiert/verwendet
- [ ] CODEOWNERS angepasst
- [ ] README aktualisiert
- [ ] Labels erstellt (mindestens: bug, enhancement, priority:*)
- [ ] Branch Protection für main aktiviert
- [ ] GitHub Project Board erstellt
- [ ] Issue Templates getestet
- [ ] PR Template getestet
- [ ] Workflows aktiviert
- [ ] Team informiert

## ❓ FAQ

### Wie aktiviere ich die Workflows?

Workflows sind automatisch aktiv nach dem ersten Push ins Repository.

### Welche Labels sind Pflicht?

Mindestens:
- `bug`, `enhancement`, `documentation`
- `priority:critical`, `priority:high`, `priority:medium`, `priority:low`

### Kann ich die Templates anpassen?

Ja! Alle Templates in `.github/` sind editierbar.

### Branch Protection für alle Branches?

Empfohlen nur für `main` und `develop`. Feature-Branches brauchen normalerweise keinen Schutz.

### Wie viele Approvals?

- `main`: 2 Approvals
- `develop`: 1 Approval
- Feature Branches: Optional

## 💡 Tipps

1. **Klein anfangen**: Starte mit basic Branch Protection und einfachen Workflows
2. **Iterativ verbessern**: Füge nach und nach mehr Automation hinzu
3. **Team einbinden**: Hole Feedback vom Team ein
4. **Dokumentieren**: Halte die Docs aktuell
5. **Messen**: Tracke Metrics (Cycle Time, Lead Time, etc.)

## 🆘 Support

Probleme oder Fragen?

1. **Check Docs**: Schau in die entsprechenden .md Dateien
2. **GitHub Discussions**: Für allgemeine Fragen
3. **Issues**: Für Bugs oder Feature-Requests am Template

---

**Happy Coding mit Best Practices! 🚀**
