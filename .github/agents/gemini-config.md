# Google Gemini Configuration

## Overview
Google Gemini is a family of multimodal AI models that can understand and generate text, code, images, audio, and video. Gemini Pro excels at code generation, analysis, and understanding complex technical content.

## Setup

### API Key Configuration
```bash
# Set your Google API key
export GOOGLE_API_KEY="AIza..."

# Or add to .env file
echo "GOOGLE_API_KEY=AIza..." >> .env
```

### Installation

#### Python
```bash
pip install google-generativeai
```

#### TypeScript/Node.js
```bash
npm install @google/generative-ai
```

## Usage

### Python Example
```python
import os
import google.generativeai as genai

# Configure the API key
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Create a model instance
model = genai.GenerativeModel('gemini-pro')

# Generate code
response = model.generate_content(
    "Write a Python function to implement binary search with type hints and docstring"
)

print(response.text)
```

### TypeScript Example
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

async function generateCode(prompt: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return text;
}

// Usage
generateCode('Write a TypeScript interface for a REST API response')
  .then(console.log);
```

## CLI Usage

### Using curl
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GOOGLE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Write a function to validate email addresses"
      }]
    }]
  }'
```

### Using gcloud CLI
```bash
# Install gcloud
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login

# Use Gemini via Vertex AI
gcloud ai models predict \
  --model=gemini-pro \
  --content='Write a Python class for data validation'
```

## Models

### Available Models

#### Gemini Pro
- **gemini-pro**: Text and code generation
- **gemini-pro-vision**: Multimodal (text, image, code)

#### Gemini 1.5 (Latest)
- **gemini-1.5-pro**: Enhanced capabilities, larger context
- **gemini-1.5-flash**: Faster, more efficient

### Model Selection Guide
- Complex code generation: `gemini-1.5-pro`
- Code with diagrams/screenshots: `gemini-pro-vision`
- Quick completions: `gemini-1.5-flash`
- General coding tasks: `gemini-pro`

### Model Capabilities
| Model | Context Window | Specialties |
|-------|----------------|-------------|
| Gemini Pro | 32K tokens | Text, Code |
| Gemini Pro Vision | 16K tokens | Multimodal |
| Gemini 1.5 Pro | 1M tokens | Long context |
| Gemini 1.5 Flash | 1M tokens | Speed |

## Best Practices

### Prompt Engineering for Code

#### Effective Prompts
```python
# Good: Specific with constraints
prompt = """
Write a Python function that:
- Accepts a list of integers
- Returns the sum of even numbers
- Includes type hints
- Has a docstring with examples
- Handles empty lists
- Uses list comprehension
"""

# Better: With context
prompt = """
I'm building a data processing pipeline in Python 3.11.

Create a function to filter and sum even numbers from a dataset.

Requirements:
- Type hints with Python 3.11+ syntax
- Google-style docstring
- Handle edge cases (None, empty list)
- Unit test example
"""
```

### Safety Settings
```python
import google.generativeai as genai

# Configure safety settings
safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
]

model = genai.GenerativeModel(
    'gemini-pro',
    safety_settings=safety_settings
)
```

### Generation Configuration
```python
generation_config = {
    "temperature": 0.7,  # Creativity (0.0-1.0)
    "top_p": 0.95,       # Nucleus sampling
    "top_k": 40,         # Top-k sampling
    "max_output_tokens": 2048,
    "stop_sequences": ["```\n\n"]
}

response = model.generate_content(
    prompt,
    generation_config=generation_config
)
```

## Advanced Features

### Streaming Responses
```python
import google.generativeai as genai

model = genai.GenerativeModel('gemini-pro')

response = model.generate_content(
    "Write a complete Python web server using Flask",
    stream=True
)

for chunk in response:
    print(chunk.text, end='', flush=True)
```

### Vision Capabilities
```python
from PIL import Image
import google.generativeai as genai

model = genai.GenerativeModel('gemini-pro-vision')

# Analyze code screenshots or architecture diagrams
image = Image.open('architecture_diagram.png')

response = model.generate_content([
    "Analyze this system architecture diagram and suggest improvements",
    image
])

print(response.text)
```

### Multi-turn Conversations
```python
model = genai.GenerativeModel('gemini-pro')
chat = model.start_chat(history=[])

# First turn
response1 = chat.send_message("Write a Python class for user authentication")
print(response1.text)

# Follow-up
response2 = chat.send_message("Add password hashing to that class")
print(response2.text)

# Another follow-up
response3 = chat.send_message("Now add JWT token generation")
print(response3.text)
```

### Code Execution
```python
# Gemini can execute code (when enabled)
model = genai.GenerativeModel(
    'gemini-pro',
    tools='code_execution'
)

response = model.generate_content("""
Write and execute Python code to:
1. Generate fibonacci numbers up to 100
2. Calculate their sum
3. Return the result
""")

print(response.text)
```

### Function Calling
```python
tools = [
    {
        "function_declarations": [
            {
                "name": "run_tests",
                "description": "Execute test suite",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "test_path": {
                            "type": "string",
                            "description": "Path to test files"
                        },
                        "verbose": {
                            "type": "boolean",
                            "description": "Verbose output"
                        }
                    }
                }
            }
        ]
    }
]

model = genai.GenerativeModel(
    'gemini-pro',
    tools=tools
)

response = model.generate_content("Run the tests in ./tests directory")
```

## Error Handling

```python
import google.generativeai as genai
from google.api_core import exceptions

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

try:
    response = model.generate_content("Your prompt")
    print(response.text)
    
except exceptions.InvalidArgument as e:
    print(f"Invalid argument: {e}")
    
except exceptions.ResourceExhausted as e:
    print(f"Quota exceeded: {e}")
    # Implement backoff
    
except exceptions.DeadlineExceeded as e:
    print(f"Timeout: {e}")
    # Retry with longer timeout
    
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Cost Optimization

### Pricing (as of 2024)

#### Gemini Pro
- Input: Free up to rate limits
- Output: Free up to rate limits

#### Gemini 1.5 Pro (Vertex AI)
- Input: $0.00025/1K characters
- Output: $0.00075/1K characters

### Optimization Tips
1. Use appropriate model for task
2. Implement caching for repeated queries
3. Set max_output_tokens appropriately
4. Use streaming for better UX
5. Batch similar requests
6. Monitor quota usage

## OAuth Integration

### Google Cloud OAuth
```python
from google.oauth2 import service_account
import google.generativeai as genai

# Using service account
credentials = service_account.Credentials.from_service_account_file(
    'path/to/service-account-key.json',
    scopes=['https://www.googleapis.com/auth/generative-language']
)

# Configure with credentials
genai.configure(credentials=credentials)
```

### Application Default Credentials
```bash
# Set up application default credentials
gcloud auth application-default login

# Use in code
from google.auth import default
credentials, project = default()
genai.configure(credentials=credentials)
```

## Integration Examples

### With GitHub Actions
```yaml
name: Code Review with Gemini

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install google-generativeai
      
      - name: Review with Gemini
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
        run: python scripts/gemini_review.py
```

### Code Review Script
```python
#!/usr/bin/env python3
import os
import sys
import subprocess
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# Get git diff
diff = subprocess.check_output(['git', 'diff', 'HEAD~1']).decode()

# Review with Gemini
prompt = f"""
Review the following code changes:

{diff}

Provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Security concerns
4. Performance implications
5. Suggestions for improvement

Format your response as structured feedback.
"""

response = model.generate_content(prompt)
print(response.text)
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Get staged changes
DIFF=$(git diff --cached)

# Review with Gemini
python3 << EOF
import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

response = model.generate_content(f"""
Quick review of these changes:
{os.environ.get('DIFF', '')}

Flag any critical issues that should block commit.
""")

print(response.text)
EOF
```

## Security

### Best Practices
- Store API keys securely
- Use environment variables
- Never commit keys to repositories
- Rotate keys regularly
- Use service accounts in production
- Set appropriate IAM permissions
- Monitor API usage
- Enable audit logging

### Key Management
```bash
# GitHub Secrets
gh secret set GOOGLE_API_KEY

# Google Secret Manager
gcloud secrets create gemini-api-key \
  --data-file=- <<< "AIza..."

# Environment files (gitignored)
echo "GOOGLE_API_KEY=AIza..." >> .env.local
```

### Content Filtering
```python
# Check if response was blocked
response = model.generate_content(prompt)

if response.prompt_feedback.block_reason:
    print(f"Blocked: {response.prompt_feedback.block_reason}")
    
# Check safety ratings
for rating in response.candidates[0].safety_ratings:
    print(f"{rating.category}: {rating.probability}")
```

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   ```python
   # Verify key format
   assert api_key.startswith("AIza"), "Invalid API key format"
   ```

2. **Quota Exceeded**
   ```python
   # Check quota in Google Cloud Console
   # Implement exponential backoff
   import time
   
   for attempt in range(5):
       try:
           response = model.generate_content(prompt)
           break
       except exceptions.ResourceExhausted:
           time.sleep(2 ** attempt)
   ```

3. **Content Blocked**
   ```python
   # Adjust safety settings or rephrase prompt
   safety_settings = {
       "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE"
   }
   ```

4. **Timeout**
   ```python
   # Increase timeout or use streaming
   import google.api_core.client_options as client_options
   
   options = client_options.ClientOptions(
       api_endpoint="generativelanguage.googleapis.com",
       timeout=60.0
   )
   ```

### Debug Logging
```python
import logging

logging.basicConfig(level=logging.DEBUG)

# Enable gRPC logging
os.environ['GRPC_VERBOSITY'] = 'DEBUG'
os.environ['GRPC_TRACE'] = 'all'
```

## Resources
- API Documentation: https://ai.google.dev/docs
- API Reference: https://ai.google.dev/api/python
- Quickstart: https://ai.google.dev/tutorials/python_quickstart
- Prompt Gallery: https://ai.google.dev/examples
- AI Studio: https://makersuite.google.com/
- Vertex AI: https://cloud.google.com/vertex-ai
