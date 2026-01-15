# .github

GitHub repository configuration with MCP (Model Context Protocol) and OpenAI Agents SDK integration.

## Overview

This repository provides configuration and integration for:
- **MCP (Model Context Protocol)**: Enables GitHub Copilot Agent Mode with enhanced context
- **OpenAI Agents SDK**: Provides AI agent capabilities
- **TypeScript**: Full TypeScript support for type-safe development

## Setup

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

## MCP Configuration

The MCP configuration is defined in `mcp-config.json`. This enables GitHub Copilot Agent Mode to access:
- GitHub repositories
- Issues and pull requests
- Code search capabilities
- And more...

## Dependencies

### Core Dependencies
- `@modelcontextprotocol/sdk` - MCP SDK for client/server communication
- `openai` - OpenAI API client
- `@openai/agents` - OpenAI Agents SDK
- `mcp-cli` - CLI tool for MCP operations (from philschmid/mcp-cli)

### Development Dependencies
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `ts-node` - TypeScript execution engine

## Usage

### Using MCP Client

```typescript
import { MCPClient } from './src/index';

const client = new MCPClient();
await client.connect('npx', ['-y', '@modelcontextprotocol/server-github']);

// List available tools
const tools = await client.listTools();
console.log(tools);
```

### Using OpenAI Agents

```typescript
import { OpenAIAgent } from './src/index';

const agent = new OpenAIAgent();
const response = await agent.chat([
  { role: 'user', content: 'Hello, how can you help me?' }
]);
console.log(response);
```

## References

- [GitHub Copilot MCP Tutorial](https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/enhance-agent-mode-with-mcp)
- [MCP CLI by philschmid](https://github.com/philschmid/mcp-cli)
- [OpenAI Agents SDK](https://developers.openai.com/codex/guides/agents-sdk)

## License

ISC
