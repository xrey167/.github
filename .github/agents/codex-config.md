# OpenAI Codex Configuration

## Overview
OpenAI Codex is an AI system that translates natural language to code. It powers GitHub Copilot and can be accessed directly via the OpenAI API.

## Setup

### API Key Configuration
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Or add to .env file
echo "OPENAI_API_KEY=sk-..." >> .env
```

### Installation

#### Python
```bash
pip install openai
```

#### TypeScript/Node.js
```bash
npm install openai
```

## Usage

### Python Example
```python
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "Write a Python function to calculate fibonacci numbers"}
    ],
    temperature=0.7,
    max_tokens=2000
)

print(response.choices[0].message.content)
```

### TypeScript Example
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateCode(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'You are a helpful coding assistant.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}
```

## CLI Usage

### Direct API Calls
```bash
# Using curl
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4-turbo-preview",
    "messages": [{"role": "user", "content": "Write a function to sort an array"}]
  }'
```

### With OpenAI CLI
```bash
# Install OpenAI CLI
pip install openai

# Use for code generation
openai api chat.completions.create \
  --model gpt-4-turbo-preview \
  --messages '[{"role": "user", "content": "Generate a REST API in Python"}]'
```

## Models

### Available Models
- **gpt-4-turbo-preview**: Most capable, best for complex tasks
- **gpt-4**: Stable version, excellent for code
- **gpt-3.5-turbo**: Faster and cheaper, good for simpler tasks

### Model Selection Guide
- Complex architecture: `gpt-4-turbo-preview`
- Code review: `gpt-4`
- Simple completions: `gpt-3.5-turbo`

## Best Practices

### Prompt Engineering
1. Be specific about requirements
2. Provide context and examples
3. Specify language and framework
4. Request comments and documentation
5. Ask for error handling

### Example Prompts
```
Good: "Write a TypeScript function that validates email addresses using regex, includes error handling, and has JSDoc comments"

Bad: "Write email validator"
```

### Token Management
- Monitor token usage with `response.usage`
- Optimize prompts to reduce tokens
- Use streaming for long responses
- Cache common responses

### Error Handling
```python
from openai import OpenAI, APIError, RateLimitError

client = OpenAI()

try:
    response = client.chat.completions.create(...)
except RateLimitError:
    print("Rate limit exceeded, waiting...")
    time.sleep(60)
except APIError as e:
    print(f"API error: {e}")
```

## OAuth Integration

### Setup OAuth Flow
```python
# For OAuth authentication (when available)
import openai

# Configure OAuth
openai.api_key = get_oauth_token()  # Implement your OAuth flow
```

## Advanced Features

### Function Calling
```python
functions = [
    {
        "name": "run_tests",
        "description": "Run test suite for the project",
        "parameters": {
            "type": "object",
            "properties": {
                "test_path": {"type": "string"}
            }
        }
    }
]

response = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[{"role": "user", "content": "Run the tests"}],
    functions=functions,
    function_call="auto"
)
```

### Streaming Responses
```python
stream = client.chat.completions.create(
    model="gpt-4-turbo-preview",
    messages=[{"role": "user", "content": "Write a long function"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## Cost Optimization

### Pricing (as of 2024)
- GPT-4 Turbo: $0.01/1K input tokens, $0.03/1K output tokens
- GPT-4: $0.03/1K input tokens, $0.06/1K output tokens
- GPT-3.5 Turbo: $0.0005/1K input tokens, $0.0015/1K output tokens

### Tips
1. Use GPT-3.5 Turbo for simple tasks
2. Cache responses when possible
3. Limit max_tokens appropriately
4. Batch similar requests
5. Monitor usage via API dashboard

## Security

### Best Practices
- Never commit API keys
- Use environment variables
- Rotate keys regularly
- Set usage limits
- Monitor for unusual activity
- Use separate keys for dev/prod

### Key Storage
```bash
# Use secret management
# GitHub Secrets
gh secret set OPENAI_API_KEY

# AWS Secrets Manager
aws secretsmanager create-secret --name openai-key --secret-string "sk-..."

# Environment files (gitignored)
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

## Troubleshooting

### Common Issues
1. **Authentication Error**: Check API key format
2. **Rate Limits**: Implement exponential backoff
3. **Timeout**: Increase timeout or use streaming
4. **Invalid Request**: Validate parameters

### Debug Mode
```python
import logging

logging.basicConfig(level=logging.DEBUG)
openai.log = "debug"
```

## Resources
- API Documentation: https://platform.openai.com/docs
- API Reference: https://platform.openai.com/docs/api-reference
- Cookbook: https://github.com/openai/openai-cookbook
- Community Forum: https://community.openai.com
