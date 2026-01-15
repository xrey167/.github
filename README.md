# .github - Best Practice Template Repository

Dieses Repository dient als **Best-Practice-Vorlage** für professionelle GitHub-Repositories mit Fokus auf:
- 🌿 **Branch Management** und Branch Protection
- 📊 **GitHub Projects** für Projektmanagement
- 🔍 **Issue Management** und Reviews für Agent Programming
- 🤖 **Automatisierung** durch GitHub Actions

## 📋 Inhaltsverzeichnis

- [Verwendung dieser Vorlage](#verwendung-dieser-vorlage)
- [Repository-Struktur](#repository-struktur)
- [Branch-Strategie](#branch-strategie)
- [Issue Templates](#issue-templates)
- [Pull Request Workflow](#pull-request-workflow)
- [GitHub Projects Setup](#github-projects-setup)
- [Automatisierung](#automatisierung)

## 🚀 Verwendung dieser Vorlage

### Als GitHub Template verwenden

1. Klicke auf **"Use this template"** oben auf der Repository-Seite
2. Wähle einen Namen für dein neues Repository
3. Das `.github` Verzeichnis wird automatisch kopiert
4. Passe die Konfigurationen an deine Bedürfnisse an

### Manuelles Kopieren

```bash
# Klone dieses Template-Repository
git clone https://github.com/xrey167/.github.git

# Kopiere die .github Struktur in dein Projekt
cp -r .github/* /pfad/zu/deinem/projekt/.github/
```

## 📁 Repository-Struktur

```
.github/
├── ISSUE_TEMPLATE/          # Issue-Vorlagen
│   ├── bug_report.yml       # Bug-Meldungen
│   ├── feature_request.yml  # Feature-Anfragen
│   ├── task.yml             # Strukturierte Aufgaben
│   ├── data_issue.yml       # Datenqualitätsprobleme
│   ├── integration_request.yml # API/System-Integrationen
│   ├── trading_strategy.yml # Trading-Strategien
│   └── config.yml           # Issue-Template Konfiguration
├── workflows/               # GitHub Actions
│   ├── pr-checks.yml        # PR Validierung
│   ├── issue-management.yml # Issue Automatisierung
│   ├── auto-label.yml       # Automatisches Labeling
│   └── stale.yml            # Kennzeichnung & Schließen inaktiver Issues/PRs
├── pull_request_template.md # PR-Vorlage
├── CODEOWNERS              # Code Review Assignments
├── BRANCH_PROTECTION.md    # Branch Protection Regeln
├── PROJECTS_SETUP.md       # GitHub Projects Guide
├── CONTRIBUTING.md         # Contribution Guidelines
└── SECURITY.md             # Security Policy
```

## 🌿 Branch-Strategie

### Branch-Typen

- **`main`** - Produktions-Branch (geschützt)
- **`develop`** - Entwicklungs-Branch (geschützt)
- **`feature/*`** - Feature-Entwicklung
- **`bugfix/*`** - Bug-Fixes
- **`hotfix/*`** - Dringende Produktions-Fixes
- **`release/*`** - Release-Vorbereitung

### Branch Protection

Siehe [BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) für detaillierte Branch Protection Regeln.

**Minimale Requirements für `main` und `develop`:**
- ✅ Require pull request reviews (mindestens 1 Approval)
- ✅ Require status checks to pass
- ✅ Require conversation resolution
- ✅ Keine direkten Commits erlaubt
- ✅ Force-Push deaktiviert

## 📝 Issue Templates

Dieses Template bietet 6 spezialisierte Issue-Vorlagen:

1. **🐛 Bug Report** - Strukturierte Fehler-Meldungen mit Schweregrad
2. **✨ Feature Request** - Neue Features mit Priorität und Akzeptanzkriterien
3. **📋 Task** - Detaillierte Entwicklungsaufgaben mit DoD
4. **📊 Data Issue** - Datenqualitätsprobleme und -validierung
5. **🔌 Integration Request** - API und System-Integrationen
6. **📈 Trading Strategy** - Trading-Strategien und Backtests

### Issue Labels

Empfohlene Labels (können über GitHub UI erstellt werden):

```yaml
# Priority
- priority:critical
- priority:high
- priority:medium
- priority:low

# Type
- bug
- enhancement
- feature
- task
- data
- integration
- strategy
- documentation

# Status
- status:triage
- status:in-progress
- status:blocked
- status:review
- status:done

# Area
- area:backend
- area:frontend
- area:api
- area:database
- area:devops
```

## 🔄 Pull Request Workflow

1. **Branch erstellen** aus `develop` mit entsprechendem Prefix
2. **Commits** mit aussagekräftigen Messages
3. **Pull Request** erstellen mit Template
4. **Code Review** durch mindestens 1 Reviewer (CODEOWNERS)
5. **CI/CD Checks** müssen grün sein
6. **Merge** nach Approval

Siehe [pull_request_template.md](.github/pull_request_template.md)

## 📊 GitHub Projects Setup

GitHub Projects ermöglicht agiles Projektmanagement direkt in GitHub.

**Siehe detaillierte Anleitung:** [PROJECTS_SETUP.md](.github/PROJECTS_SETUP.md)

### Quick Start

1. Gehe zu Repository → Projects → New Project
2. Wähle Template "Kanban" oder "Team Backlog"
3. Verknüpfe Issues und Pull Requests
4. Nutze Automation für Status-Updates

## 🤖 Automatisierung

### GitHub Actions Workflows

**PR Checks** (`pr-checks.yml`)
- Validiert PR-Titel Format
- Prüft auf verknüpfte Issues
- Führt Linting/Tests aus
- Kommentiert Review-Checkliste

**Issue Management** (`issue-management.yml`)
- Auto-Labeling basierend auf Template
- Zuweisungen nach CODEOWNERS
- Stale Issue Handling
- Projekt-Board Updates

**Auto-Label** (`auto-label.yml`)
- Automatisches Labeling basierend auf:
  - Geänderten Dateien
  - Branch-Namen
  - Issue-Titel/Inhalt

## 👥 Code Review

### CODEOWNERS

Das `CODEOWNERS` File definiert automatische Review-Zuweisungen:

```
# Backend-Code
/backend/**     @backend-team
/api/**         @api-team

# Frontend
/frontend/**    @frontend-team

# Infrastructure
/.github/**     @devops-team
/terraform/**   @devops-team
```

### Review-Checkliste

- [ ] Code folgt Projekt-Konventionen
- [ ] Tests sind vorhanden und bestehen
- [ ] Dokumentation ist aktualisiert
- [ ] Keine Security-Vulnerabilities
- [ ] Performance-Implikationen berücksichtigt
- [ ] Breaking Changes dokumentiert

## 🔒 Security

Siehe [SECURITY.md](SECURITY.md) für:
- Vulnerability Reporting
- Security Best Practices
- Dependency Updates

## 🤝 Contributing

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für:
- Development Setup
- Code Style Guidelines
- Testing Requirements
- PR-Prozess

## 📚 Best Practices für Agent Programming

### Issue Management für KI-Agents

1. **Klare Zielbeschreibungen**: Jedes Issue sollte präzise formuliert sein
2. **Akzeptanzkriterien**: Messbare Erfolgskriterien definieren
3. **Kontext bereitstellen**: Links zu relevanten Docs/Code
4. **Schritt-für-Schritt Tasks**: Große Aufgaben in kleine Schritte unterteilen

### PR Reviews für Agent-generierten Code

1. **Automatische Checks**: CI/CD für Syntax, Linting, Tests
2. **Code-Qualität**: SonarQube, CodeQL für Sicherheit
3. **Human Review**: Mindestens ein menschlicher Reviewer
4. **Dokumentation**: Agents sollten Code-Kommentare und Docs liefern

### Automation-Workflows

- **Auto-Assignment**: Issues automatisch zuweisen
- **Status-Tracking**: Projekt-Status automatisch aktualisieren
- **Notifications**: Team bei wichtigen Events benachrichtigen
- **Metrics**: Cycle Time, Lead Time, Velocity tracken

## 📖 Weitere Ressourcen

- [GitHub Docs - About Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Docs - About Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 📄 Lizenz

Dieses Template ist frei verwendbar. Passe es an deine Bedürfnisse an!

---

**Erstellt für professionelles Software-Engineering mit Fokus auf Agent Programming und Automatisierung.**
