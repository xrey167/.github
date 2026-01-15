# Anthropic Claude Code Configuration

## Overview
Claude is an AI assistant by Anthropic, designed for safety, accuracy, and helpful dialogue. Claude Code excels at code reasoning, analysis, and refactoring.

## Setup

### API Key Configuration
```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Or add to .env file
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### Installation

#### Python
```bash
pip install anthropic
```

#### TypeScript/Node.js
```bash
npm install @anthropic-ai/sdk
```

## Usage

### Python Example
```python
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

message = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=4096,
    system="You are an expert code reviewer and refactoring specialist.",
    messages=[
        {"role": "user", "content": "Review this Python function and suggest improvements: def calc(x,y): return x+y"}
    ]
)

print(message.content[0].text)
```

### TypeScript Example
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function reviewCode(code: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 4096,
    system: 'You are an expert code reviewer and refactoring specialist.',
    messages: [
      { role: 'user', content: `Review this code: ${code}` }
    ],
  });

  return message.content[0].text;
}
```

## CLI Usage

### Using curl
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 4096,
    "messages": [
      {"role": "user", "content": "Write a TypeScript interface for a user profile"}
    ]
  }'
```

### Using Python CLI
```bash
# Create a simple CLI wrapper
python -c "
import anthropic
import sys
client = anthropic.Anthropic()
response = client.messages.create(
    model='claude-3-sonnet-20240229',
    max_tokens=4096,
    messages=[{'role': 'user', 'content': sys.argv[1]}]
)
print(response.content[0].text)
" "Your prompt here"
```

## Models

### Available Models
- **claude-3-opus-20240229**: Most powerful, best for complex reasoning
- **claude-3-sonnet-20240229**: Balanced performance and speed
- **claude-3-haiku-20240307**: Fastest, most affordable

### Model Selection Guide
- Architecture design & complex refactoring: `claude-3-opus`
- Code review & analysis: `claude-3-sonnet`
- Quick completions & simple tasks: `claude-3-haiku`

### Model Capabilities
| Model | Context Window | Max Output |
|-------|----------------|------------|
| Opus  | 200K tokens   | 4096 tokens |
| Sonnet| 200K tokens   | 4096 tokens |
| Haiku | 200K tokens   | 4096 tokens |

## Best Practices

### Prompt Engineering
Claude responds well to:
1. Clear, structured prompts
2. XML-tagged sections for organization
3. Examples and context
4. Step-by-step instructions
5. Role definitions in system prompt

### Example Structured Prompt
```python
prompt = """
<task>
Refactor the following Python code to follow best practices
</task>

<code>
def process_data(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result
</code>

<requirements>
- Use list comprehension
- Add type hints
- Include docstring
- Handle edge cases
</requirements>
"""
```

### Long Context Usage
Claude excels with long context:
```python
# Analyze entire codebase
with open('large_file.py', 'r') as f:
    code = f.read()

message = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": f"Analyze this entire module and suggest architectural improvements:\n\n{code}"
    }]
)
```

## Advanced Features

### Streaming Responses
```python
with client.messages.stream(
    model="claude-3-sonnet-20240229",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Generate a large class"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Vision Capabilities
```python
import base64

# Analyze code screenshots or diagrams
with open("architecture_diagram.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

message = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_data
                }
            },
            {
                "type": "text",
                "text": "Explain this architecture diagram and suggest improvements"
            }
        ]
    }]
)
```

### Multi-turn Conversations
```python
conversation = [
    {"role": "user", "content": "Write a Python class for user management"},
    {"role": "assistant", "content": "Here's a user management class..."},
    {"role": "user", "content": "Now add authentication methods"}
]

message = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=4096,
    messages=conversation
)
```

## Error Handling

```python
from anthropic import (
    Anthropic,
    APIError,
    RateLimitError,
    APIConnectionError
)

client = Anthropic()

try:
    message = client.messages.create(...)
except RateLimitError as e:
    print(f"Rate limit hit: {e}")
    # Implement backoff
except APIConnectionError as e:
    print(f"Connection error: {e}")
    # Retry logic
except APIError as e:
    print(f"API error: {e}")
```

## Cost Optimization

### Pricing (as of 2024)
- Claude 3 Opus: $15/1M input tokens, $75/1M output tokens
- Claude 3 Sonnet: $3/1M input tokens, $15/1M output tokens
- Claude 3 Haiku: $0.25/1M input tokens, $1.25/1M output tokens

### Optimization Tips
1. Use Haiku for simple tasks
2. Leverage large context to reduce round trips
3. Cache system prompts when possible
4. Use streaming for better UX
5. Set appropriate max_tokens

## OAuth Integration

### Setup (when available)
```python
# OAuth flow implementation
from anthropic import Anthropic

def get_claude_client():
    # Implement OAuth token retrieval
    token = get_oauth_token()
    return Anthropic(api_key=token)
```

## Code Review Prompts

### Comprehensive Review
```python
review_prompt = """
Please review the following code for:
1. Security vulnerabilities
2. Performance issues
3. Code style and best practices
4. Potential bugs
5. Suggestions for refactoring

<code>
{code_content}
</code>

Provide specific, actionable feedback with examples.
"""
```

### Refactoring Suggestions
```python
refactor_prompt = """
Analyze this code and suggest refactoring to:
- Improve readability
- Reduce complexity
- Follow SOLID principles
- Enhance testability
- Modern language features

<code>
{code_content}
</code>

Provide before/after examples for each suggestion.
"""
```

## Security

### Best Practices
- Store API keys securely
- Never commit keys to version control
- Use environment variables
- Rotate keys periodically
- Monitor usage via dashboard
- Set spending limits

### Key Management
```bash
# GitHub Secrets
gh secret set ANTHROPIC_API_KEY

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name anthropic-api-key \
  --secret-string "sk-ant-..."

# .env file (gitignored)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API key format (starts with `sk-ant-`)
   - Check key is active in console

2. **Rate Limits**
   - Implement exponential backoff
   - Monitor usage dashboard
   - Consider upgrading tier

3. **Context Length Exceeded**
   - Check token count before sending
   - Split large requests if needed

4. **Timeout Errors**
   - Increase timeout parameter
   - Use streaming for long responses

### Debug Logging
```python
import logging

logging.basicConfig(level=logging.DEBUG)

# Enable SDK debug logging
client = Anthropic(api_key="...", timeout=60.0)
```

## Integration Examples

### With CI/CD
```yaml
# GitHub Actions example
- name: Code Review with Claude
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    python scripts/claude_review.py
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Review staged changes with Claude
git diff --cached | python -c "
import sys
import anthropic
client = anthropic.Anthropic()
diff = sys.stdin.read()
# Send diff to Claude for review
"
```

## Resources
- API Documentation: https://docs.anthropic.com
- API Reference: https://docs.anthropic.com/claude/reference
- Prompt Engineering: https://docs.anthropic.com/claude/docs/prompt-engineering
- Console: https://console.anthropic.com
