# .github

Community Health Files & Agent System für xrey167

## Übersicht

Dieses Repository enthält die Standard-Community-Health-Dateien und das AI-Agent-System für alle Repositories der Organisation.

This repository also provides configuration and integration for:
- **MCP (Model Context Protocol)**: Enables GitHub Copilot Agent Mode with enhanced context
- **OpenAI Agents SDK**: Provides AI agent capabilities
- **TypeScript**: Full TypeScript support for type-safe development

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

## 🔧 Konfiguration

Die Agent-Konfiguration befindet sich in `.github/agent-config.yml`. Dort können neue Agents hinzugefügt oder bestehende angepasst werden.

## References

- [GitHub Copilot MCP Tutorial](https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/enhance-agent-mode-with-mcp)
- [MCP CLI by philschmid](https://github.com/philschmid/mcp-cli)
- [OpenAI SDK Documentation](https://platform.openai.com/docs/api-reference)

## 📚 Weitere Ressourcen

- [GitHub Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [GitHub Actions](https://docs.github.com/en/actions)

## MCP & OpenAI Agents SDK Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# For GitHub MCP
export GITHUB_TOKEN=your_github_token

# For OpenAI Agents SDK
export OPENAI_API_KEY=your_openai_api_key
```

3. Build TypeScript code:
```bash
npm run build
```

### MCP Configuration

The MCP configuration is defined in `mcp-config.json`. This enables GitHub Copilot Agent Mode to access:
- GitHub repositories
- Issues and pull requests
- Code search capabilities
- And more...

### Dependencies

#### Core Dependencies
- `@modelcontextprotocol/sdk` - MCP SDK for client/server communication
- `openai` - OpenAI API client
- `@openai/agents` - OpenAI Agents SDK
- `mcp-cli` - CLI tool for MCP operations (from philschmid/mcp-cli)

#### Development Dependencies
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `ts-node` - TypeScript execution engine

### Usage

#### Using MCP Client

```typescript
import { MCPClient } from './src/index';

const client = new MCPClient();
await client.connect('npx', ['-y', '@modelcontextprotocol/server-github']);

// List available tools
const tools = await client.listTools();
console.log(tools);
```

#### Using OpenAI Agents

```typescript
import { OpenAIAgent } from './src/index';

const agent = new OpenAIAgent();
const response = await agent.chat([
  { role: 'user', content: 'Hello, how can you help me?' }
]);
console.log(response);
```

## License

ISC
