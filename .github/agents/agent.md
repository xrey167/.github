# AI Coding Agents Configuration

This file contains configuration and prompts for various AI coding agents used in this repository.

## Supported Agents
- **GitHub Copilot**: Code completion and chat assistance
- **OpenAI Codex**: Advanced code generation and analysis
- **Anthropic Claude Code**: Code reasoning and refactoring
- **Google Gemini**: Multi-modal code assistance

## Agent Capabilities

### Code Generation
- Generate boilerplate code for common patterns
- Implement functions based on specifications
- Create unit tests for existing code
- Generate documentation and docstrings

### Code Review
- Identify potential bugs and issues
- Suggest performance improvements
- Check for security vulnerabilities
- Recommend best practices

### Refactoring
- Simplify complex code
- Extract reusable components
- Improve naming and structure
- Modernize deprecated patterns

### Documentation
- Generate API documentation
- Create usage examples
- Write clear code comments
- Maintain README files

## Agent Instructions

### For Code Completion
When providing code suggestions:
1. Consider the current file context and imports
2. Match the existing code style and patterns
3. Suggest type-safe implementations
4. Include error handling where appropriate
5. Add brief comments for complex logic

### For Code Review
When reviewing code:
1. Check for common security issues
2. Verify error handling is present
3. Ensure tests cover the changes
4. Validate documentation is updated
5. Suggest performance optimizations

### For Refactoring
When refactoring code:
1. Maintain backward compatibility when possible
2. Preserve existing functionality
3. Improve code readability
4. Reduce code duplication
5. Update tests accordingly

## Language-Specific Guidelines

### Python Projects
- Use type hints consistently
- Follow PEP 8 conventions
- Prefer descriptive names over abbreviations
- Use context managers for resource handling
- Implement comprehensive error handling

### TypeScript Projects
- Enable strict mode
- Use explicit return types
- Prefer readonly when appropriate
- Implement proper null checks
- Use discriminated unions for variants

## OAuth and SDK Integration

### Authentication Setup
All AI coding agents can be accessed via OAuth:
- GitHub Copilot: Uses GitHub account authentication
- OpenAI Codex: Requires OpenAI API key
- Anthropic Claude: Requires Anthropic API key
- Google Gemini: Requires Google Cloud credentials

### CLI Usage
```bash
# GitHub Copilot CLI
gh copilot suggest "your prompt here"
gh copilot explain "code to explain"

# OpenAI CLI (with oauth)
openai api chat.completions.create --model gpt-4 --messages '[{"role": "user", "content": "your prompt"}]'

# Anthropic Claude CLI
claude --prompt "your prompt here"

# Google Gemini CLI
gcloud ai models predict --model gemini-pro --content "your prompt"
```

### SDK Integration

#### Python SDKs
```python
# OpenAI
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")

# Anthropic
import anthropic
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Google Gemini
import google.generativeai as genai
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
```

#### TypeScript SDKs
```typescript
// OpenAI
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Anthropic
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Google Gemini
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
```

## Dependencies

### Python Requirements
```
openai>=1.0.0
anthropic>=0.18.0
google-generativeai>=0.3.0
```

### TypeScript/Node.js Dependencies
```json
{
  "openai": "^4.0.0",
  "@anthropic-ai/sdk": "^0.18.0",
  "@google/generative-ai": "^0.3.0"
}
```

## MCP (Model Context Protocol) Integration

The Model Context Protocol allows extending AI coding agents with custom context providers.

### Configuration Location
- Configuration file: `.github/copilot/mcp-config.json`
- Custom context providers can be added to enhance agent responses

### Usage
MCP enables agents to:
- Access repository-specific context
- Use custom tools and APIs
- Integrate with external services
- Maintain conversation history

## Best Practices

### When to Use Each Agent
- **GitHub Copilot**: Daily coding, inline suggestions, quick fixes
- **OpenAI Codex**: Complex code generation, algorithm implementation
- **Claude Code**: Code analysis, refactoring, architectural decisions
- **Gemini**: Multi-modal tasks, documentation with diagrams

### Performance Tips
- Keep prompts clear and specific
- Provide context about the project
- Reference existing code patterns
- Break complex tasks into smaller steps
- Review and test all generated code

### Security Considerations
- Never include secrets in prompts
- Review generated code for vulnerabilities
- Validate external inputs
- Use secure coding practices
- Keep API keys in environment variables

## Troubleshooting

### Common Issues
1. **Rate Limiting**: Implement exponential backoff
2. **Context Length**: Break large files into chunks
3. **Token Limits**: Optimize prompt length
4. **Authentication**: Verify API keys are set correctly

### Support Resources
- GitHub Copilot Docs: https://docs.github.com/copilot
- OpenAI Documentation: https://platform.openai.com/docs
- Anthropic Documentation: https://docs.anthropic.com
- Google AI Documentation: https://ai.google.dev
