# .github

Configuration repository for AI coding agents integration with GitHub Copilot, OpenAI Codex, Anthropic Claude, and Google Gemini.

## Features

- ✅ GitHub Copilot custom instructions and environment setup
- ✅ OpenAI Codex (GPT-4) integration for advanced code generation
- ✅ Anthropic Claude integration for code review and refactoring
- ✅ Google Gemini integration for documentation and multi-modal tasks
- ✅ Model Context Protocol (MCP) configuration
- ✅ CLI examples for Python and TypeScript
- ✅ Best practices and security guidelines
- ✅ CI/CD integration examples

## Quick Start

### 1. Setup API Keys

```bash
# Copy environment template
cp .env.template .env

# Edit .env and add your API keys
# Get keys from:
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/settings/keys
# - Google: https://makersuite.google.com/app/apikey
```

### 2. Install Dependencies

#### Python
```bash
pip install -r .github/agents/requirements.txt
```

#### TypeScript/Node.js
```bash
cd .github/agents
npm install
```

### 3. Install GitHub Copilot CLI

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

## Usage

### GitHub Copilot CLI

```bash
# Get suggestions
gh copilot suggest "Write a Python function to validate email"

# Explain code
gh copilot explain "complex code here"
```

### Python CLI

```bash
# Generate code
python .github/agents/cli-example.py --agent openai --prompt "Your prompt"

# Compare agents
python .github/agents/cli-example.py --compare --prompt "Your prompt"
```

### TypeScript CLI

```bash
# Generate code
npx ts-node .github/agents/cli-example.ts --agent anthropic --prompt "Your prompt"
```

## Documentation

- **[.github/agents/README.md](.github/agents/README.md)** - Comprehensive setup guide
- **[.github/agents/BEST_PRACTICES.md](.github/agents/BEST_PRACTICES.md)** - Best practices for using AI agents
- **[.github/agents/agent.md](.github/agents/agent.md)** - Agent configuration and prompts
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Custom Copilot instructions

## Configuration Files

- **`.github/copilot-instructions.md`** - Custom instructions for GitHub Copilot
- **`.github/copilot/environment.json`** - Environment and dependency setup
- **`.github/copilot/mcp-config.json`** - Model Context Protocol configuration
- **`.github/agents/codex-config.md`** - OpenAI Codex configuration
- **`.github/agents/claude-config.md`** - Anthropic Claude configuration
- **`.github/agents/gemini-config.md`** - Google Gemini configuration

## Supported Languages

- **Python** (Primary) - Type hints, pytest, black, pylint
- **TypeScript** (Primary) - Strict mode, ESLint, Jest

## Security

⚠️ **Important**: Never commit API keys to version control!

- Store keys in `.env` files (gitignored)
- Use environment variables
- Use secret management in production
- Rotate keys regularly

## Resources

- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [OpenAI Platform](https://platform.openai.com/docs)
- [Anthropic Documentation](https://docs.anthropic.com)
- [Google AI Documentation](https://ai.google.dev)

## License

See repository license.
