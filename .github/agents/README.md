# AI Coding Agents Configuration

This directory contains configuration files and examples for integrating multiple AI coding agents (GitHub Copilot, OpenAI Codex, Anthropic Claude, and Google Gemini) into your development workflow.

## Contents

- **agent.md** - Main configuration and prompts for all AI agents
- **codex-config.md** - OpenAI Codex specific configuration
- **claude-config.md** - Anthropic Claude specific configuration
- **gemini-config.md** - Google Gemini specific configuration
- **BEST_PRACTICES.md** - Comprehensive best practices guide
- **cli-example.py** - Python CLI example for using agents
- **cli-example.ts** - TypeScript CLI example for using agents
- **requirements.txt** - Python dependencies
- **package.json** - Node.js/TypeScript dependencies

## Quick Start

### 1. Set up API Keys

Create a `.env` file in your project root (add to `.gitignore`):

```bash
# OpenAI Codex
OPENAI_API_KEY=sk-...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GOOGLE_API_KEY=AIza...
```

### 2. Install Dependencies

#### Python
```bash
pip install -r .github/agents/requirements.txt
```

#### TypeScript/Node.js
```bash
npm install --save openai @anthropic-ai/sdk @google/generative-ai dotenv
npm install --save-dev typescript @types/node ts-node
```

### 3. GitHub Copilot Setup

```bash
# Install GitHub CLI
brew install gh  # macOS
# or: sudo apt install gh  # Linux

# Install Copilot extension
gh extension install github/gh-copilot

# Authenticate
gh auth login

# Configure Copilot
gh copilot config
```

## Usage

### GitHub Copilot (CLI)

```bash
# Get code suggestions
gh copilot suggest "Write a Python function to validate email"

# Explain code
gh copilot explain "def factorial(n): return 1 if n <= 1 else n * factorial(n-1)"

# Ask questions
gh copilot ask "How do I handle async errors in TypeScript?"
```

### Python CLI Example

```bash
# Generate code with OpenAI
python .github/agents/cli-example.py --agent openai --prompt "Write a binary search function"

# Compare all agents
python .github/agents/cli-example.py --compare --prompt "Write a REST API handler"

# Use from stdin
echo "Write a sorting algorithm" | python .github/agents/cli-example.py --agent anthropic --stdin
```

### TypeScript CLI Example

```bash
# Generate code with Claude
npx ts-node .github/agents/cli-example.ts --agent anthropic --prompt "Write a TypeScript interface"

# Compare all agents
npx ts-node .github/agents/cli-example.ts --compare --prompt "Write a validation function"
```

### Direct API Usage

#### Python
```python
import os
from openai import OpenAI
import anthropic
import google.generativeai as genai

# OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
response = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[{"role": "user", "content": "Write a function"}]
)

# Anthropic
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
message = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Review this code"}]
)

# Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')
response = model.generate_content("Generate documentation")
```

#### TypeScript
```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Write a function' }],
});

// Anthropic
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const message = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 4096,
  messages: [{ role: 'user', content: 'Review this code' }],
});

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
const result = await model.generateContent('Generate documentation');
```

## Configuration Files

### Copilot Custom Instructions

Located at `.github/copilot-instructions.md`, this file provides custom instructions for GitHub Copilot to follow your project's specific conventions and preferences.

### Environment Configuration

Located at `.github/copilot/environment.json`, this file specifies:
- Required dependencies (Python packages, npm packages)
- Environment variables
- Setup scripts
- Test commands

### MCP Configuration

Located at `.github/copilot/mcp-config.json`, this file configures:
- Model Context Protocol servers
- Context providers
- Tool integrations
- Feature flags

## Agent Selection Guide

| Task | Recommended Agent | Reason |
|------|------------------|---------|
| Inline completion | GitHub Copilot | Fast, context-aware |
| Complex algorithms | OpenAI GPT-4 | Best reasoning |
| Code review | Claude Sonnet | Thorough analysis |
| Refactoring | Claude Opus | Architectural thinking |
| Documentation | Gemini Pro | Clear explanations |
| Diagrams/Screenshots | Gemini Vision | Multi-modal |
| Quick tasks | Gemini Flash | Fast and cheap |

## Best Practices

1. **Start with Copilot** for inline coding
2. **Use Claude** for code reviews and refactoring
3. **Use GPT-4** for complex problem-solving
4. **Use Gemini** for documentation and cost-sensitive tasks
5. **Always review** AI-generated code
6. **Never commit** API keys
7. **Set usage limits** to control costs
8. **Monitor usage** regularly

## Cost Optimization

### Pricing Overview (approximate)
- **GitHub Copilot**: $10/month per user (includes CLI)
- **OpenAI GPT-4 Turbo**: $0.01 input / $0.03 output per 1K tokens
- **Claude Sonnet**: $0.003 input / $0.015 output per 1K tokens
- **Gemini Pro**: Currently free up to rate limits

### Tips
- Use Gemini for high-volume, simple tasks
- Use Claude Haiku for quick completions
- Use GPT-3.5 Turbo for less complex tasks
- Cache responses when possible
- Set max_tokens appropriately

## Security

### API Key Security
- Store keys in environment variables
- Use secret management systems in production
- Never commit keys to repositories
- Rotate keys regularly (every 90 days)
- Set usage limits and alerts

### Code Review
Always review AI-generated code for:
- Security vulnerabilities
- Logic errors
- Performance issues
- Best practices compliance
- Test coverage

## Integration with CI/CD

See `BEST_PRACTICES.md` for examples of:
- Pre-commit hooks with AI review
- GitHub Actions workflows
- Automated code review
- Test generation
- Documentation updates

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API key is set correctly
   - Check key format (OpenAI: `sk-...`, Anthropic: `sk-ant-...`)
   - Ensure no extra whitespace in .env file

2. **Rate Limiting**
   - Implement exponential backoff
   - Use cheaper models for simple tasks
   - Monitor usage dashboard

3. **Import Errors**
   - Ensure all dependencies are installed
   - Check Python/Node version compatibility
   - Verify virtual environment is activated

4. **Timeout Errors**
   - Increase timeout settings
   - Use streaming for long responses
   - Split large requests

## Resources

### Documentation
- [GitHub Copilot Docs](https://docs.github.com/copilot)
- [OpenAI Platform](https://platform.openai.com/docs)
- [Anthropic Docs](https://docs.anthropic.com)
- [Google AI](https://ai.google.dev)

### GitHub References
- [Copilot Coding Agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent)
- [Custom Instructions](https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/coding-agent/get-the-best-results#adding-custom-instructions-to-your-repository)
- [Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- [MCP Integration](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/extend-copilot-chat-with-mcp)

### Tools
- [Model Context Protocol](https://platform.openai.com/docs/guides/tools-connectors-mcp)
- [GitHub CLI](https://cli.github.com)

## Support

For issues or questions:
1. Check the documentation files in this directory
2. Review BEST_PRACTICES.md for detailed guides
3. Consult official documentation links above
4. Open an issue in the repository

## Contributing

When adding new agents or configurations:
1. Update relevant config files
2. Add examples to CLI scripts
3. Update this README
4. Document in BEST_PRACTICES.md
5. Test with all supported languages

## License

This configuration is part of the repository and follows the same license terms.
