# .github - Best Practice Template Repository & Agent System

Dieses Repository dient als **Best-Practice-Vorlage** für professionelle GitHub-Repositories mit Fokus auf:
- 🌿 **Branch Management** und Branch Protection
- 📊 **GitHub Projects** für Projektmanagement
- 🔍 **Issue Management** und Reviews für Agent Programming
- 🤖 **AI-Agent-System** für automatisierte Aufgaben
- 🔧 **Automatisierung** durch GitHub Actions

## 📋 Inhaltsverzeichnis

- [Verwendung dieser Vorlage](#verwendung-dieser-vorlage)
- [Repository-Struktur](#repository-struktur)
- [AI-Agent-System](#ai-agent-system)
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
│   ├── stale.yml            # Kennzeichnung & Schließen inaktiver Issues/PRs
│   ├── agent-dispatcher.yml # AI-Agent Dispatcher
│   └── agent-task-manager.yml # Agent Task Management
├── pull_request_template.md # PR-Vorlage
├── CODEOWNERS              # Code Review Assignments
├── BRANCH_PROTECTION.md    # Branch Protection Regeln
├── PROJECTS_SETUP.md       # GitHub Projects Guide
├── CONTRIBUTING.md         # Contribution Guidelines
├── SECURITY.md             # Security Policy
├── agent-config.yml        # AI-Agent Konfiguration
├── AGENT_GUIDE.md          # Agent System Guide
├── AGENT_ARCHITECTURE.md   # Agent System Architecture
└── AGENT_EXAMPLES.md       # Agent Usage Examples
```
# .github

Community Health Files & AI Coding Agents System für xrey167

This repository contains standard community health files and a comprehensive AI coding agent integration system for all organization repositories.

---

## 🤖 AI-Agent-System / Agent System

This repository implements two complementary agent systems:

1. **Issue/PR Agent Tagging System** - Automatic agent assignment via mentions
2. **AI Coding Agents Integration** - Multi-provider code generation and assistance

---

## 📋 Community Health Files

### Issue Templates
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

---

## 🏷️ Agent Tagging System

### Verfügbare Agents

Du kannst AI-Agenten in Issues und Kommentaren erwähnen, die dann automatisch reagieren und Aufgaben übernehmen.

#### @codex 🤖
- **Spezialisierung**: Code-Generierung und technische Lösungen
- **Fähigkeiten**: Code-Generierung, Bug-Fixes, Code-Refactoring, Technische Dokumentation, API-Entwicklung

#### @copilot 🚁
- **Spezialisierung**: Code-Entwicklung und Problem-Lösung
- **Fähigkeiten**: Code-Entwicklung, Code-Review, Testing, Debugging, Best Practices

#### @gemini ✨
- **Spezialisierung**: Fortgeschrittene Analyse und kreative Lösungsansätze
- **Fähigkeiten**: Komplexe Analyse, Architektur-Design, Strategische Planung, Kreative Lösungen, Multi-modale Aufgaben
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
@copilot dieser Bug muss dringend gefixt werden
@gemini analysiere bitte die Architektur
```

**Was passiert dann?**
1. **Automatische Reaktion** 🚀: Der Agent reagiert mit einem Emoji
2. **Bestätigung**: Der Agent erstellt einen Kommentar
3. **Tracking**: Ein Label (z.B. `agent:codex`) wird hinzugefügt
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

---

## 🔧 AI Coding Agents Integration

Direct integration with multiple AI providers for code generation, review, and assistance.

### Features

- ✅ GitHub Copilot custom instructions and environment setup
- ✅ OpenAI Codex (GPT-4) integration for advanced code generation
- ✅ Anthropic Claude integration for code review and refactoring
- ✅ Google Gemini integration for documentation and multi-modal tasks
- ✅ Model Context Protocol (MCP) configuration
- ✅ CLI examples for Python and TypeScript
- ✅ Best practices and security guidelines
- ✅ CI/CD integration examples

### Quick Start

#### 1. Setup API Keys

```bash
# Copy environment template
cp .env.template .env

# Edit .env and add your API keys
# Get keys from:
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/settings/keys
# - Google: https://makersuite.google.com/app/apikey
```

#### 2. Install Dependencies

**Python:**
```bash
pip install -r .github/agents/requirements.txt
```

**TypeScript/Node.js:**
```bash
cd .github/agents
npm install
```

#### 3. Install GitHub Copilot CLI

```bash
# Install GitHub CLI if not already installed
brew install gh  # macOS
# or: sudo apt install gh  # Linux
# or: winget install GitHub.cli  # Windows

# Install Copilot extension
gh extension install github/gh-copilot

# Authenticate
gh auth login
```

### Usage

#### GitHub Copilot CLI

```bash
# Get suggestions
gh copilot suggest "Write a Python function to validate email"

# Explain code
gh copilot explain "complex code here"
```

#### Python CLI

```bash
# Generate code
python .github/agents/cli-example.py --agent openai --prompt "Your prompt"

# Compare agents
python .github/agents/cli-example.py --compare --prompt "Your prompt"
```

#### TypeScript CLI

```bash
# Generate code
npx ts-node .github/agents/cli-example.ts --agent anthropic --prompt "Your prompt"
```

### Documentation

- **[.github/agents/README.md](.github/agents/README.md)** - Comprehensive setup guide
- **[.github/agents/BEST_PRACTICES.md](.github/agents/BEST_PRACTICES.md)** - Best practices for using AI agents
- **[.github/agents/agent.md](.github/agents/agent.md)** - Agent configuration and prompts
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Custom Copilot instructions

### Configuration Files

- **`.github/copilot-instructions.md`** - Custom instructions for GitHub Copilot
- **`.github/copilot/environment.json`** - Environment and dependency setup
- **`.github/copilot/mcp-config.json`** - Model Context Protocol configuration
- **`.github/agents/codex-config.md`** - OpenAI Codex configuration
- **`.github/agents/claude-config.md`** - Anthropic Claude configuration
- **`.github/agents/gemini-config.md`** - Google Gemini configuration

### Supported Languages

- **Python** (Primary) - Type hints, pytest, black, pylint
- **TypeScript** (Primary) - Strict mode, ESLint, Jest

### Security

⚠️ **Important**: Never commit API keys to version control!

- Store keys in `.env` files (gitignored)
- Use environment variables
- Use secret management in production
- Rotate keys regularly

---

## 📚 Resources

### Agent Tagging System
- [GitHub Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [GitHub Actions](https://docs.github.com/en/actions)

### AI Coding Agents
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [OpenAI Platform](https://platform.openai.com/docs)
- [Anthropic Documentation](https://docs.anthropic.com)
- [Google AI Documentation](https://ai.google.dev)

## 🔧 Configuration

Die Agent-Konfiguration für das Tagging-System befindet sich in `.github/agent-config.yml`.

Die AI Coding Agents Konfiguration befindet sich in `.github/agents/` und `.github/copilot/`.

## License

See repository license.
**Weitere Details**: Siehe [AGENT_GUIDE.md](.github/AGENT_GUIDE.md)

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

# Agent
- agent:codex
- agent:copilot
- agent:gemini
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

**AI-Agent System** (`agent-dispatcher.yml`, `agent-task-manager.yml`)
- Automatische Agent-Erkennung in Issues/Kommentaren
- Agent-Zuweisung und Tracking
- Workflow-basierte Agent-Steuerung

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
- [GitHub Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
## 📚 Weitere Ressourcen

- [GitHub Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🔧 Konfiguration

Die Agent-Konfiguration befindet sich in `.github/agent-config.yml`. Dort können neue Agents hinzugefügt oder bestehende angepasst werden.


## 📄 Lizenz

Dieses Template ist frei verwendbar. Passe es an deine Bedürfnisse an!

---


