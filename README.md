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
