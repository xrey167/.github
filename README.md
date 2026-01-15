# .github

GitHub repository configuration with AI SDK dependencies.

## Installed SDKs

This repository includes the following AI SDK dependencies:

### Python SDKs

Install Python dependencies:

```bash
pip install -r requirements.txt
```

- **Google Gemini / GenAI SDK** (`google-generativeai>=0.8.6`) - [Documentation](https://ai.google.dev/gemini-api/docs/interactions#sdk)
  - **Note**: The `google-generativeai` package is deprecated. Consider migrating to `google-genai` for new projects.
- **Anthropic Claude SDK** (`anthropic>=0.76.0`) - For Claude API interactions
- **OpenAI SDK** (`openai>=2.15.0`) - For GPT and other OpenAI models
- **Model Context Protocol SDK** (`mcp>=1.25.0`) - MCP Python implementation

### Node.js SDKs

Install Node.js dependencies:

```bash
npm install --legacy-peer-deps
```

- **Google Generative AI** (`@google/generative-ai`) - Google's Gemini API for Node.js
- **Anthropic SDK** (`@anthropic-ai/sdk`) - Claude API for Node.js
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) - Claude Agent SDK for building AI agents
- **Model Context Protocol SDK** (`@modelcontextprotocol/sdk`) - MCP TypeScript implementation
- **OpenAI SDK** (`openai`) - OpenAI API for Node.js including GPT model support

## Verification

Run the verification scripts to ensure all SDKs are properly installed:

### Python Verification

```bash
python3 verify_python_sdks.py
```

### Node.js Verification

```bash
node verify_node_sdks.js
```

## Usage

### Python Example

```python
import google.generativeai as genai
from anthropic import Anthropic
from openai import OpenAI

# Configure Google Gemini
genai.configure(api_key='your-api-key')

# Initialize Anthropic client
anthropic_client = Anthropic(api_key='your-api-key')

# Initialize OpenAI client
openai_client = OpenAI(api_key='your-api-key')
```

### Node.js Example

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');

// Initialize clients
const genai = new GoogleGenerativeAI('your-api-key');
const anthropic = new Anthropic({ apiKey: 'your-api-key' });
const openai = new OpenAI({ apiKey: 'your-api-key' });
```

## Documentation

- [Google Gemini API Documentation](https://ai.google.dev/gemini-api/docs/interactions#sdk)
- [Claude Agent SDK Documentation](https://github.com/anthropic/claude-agent-sdk-typescript)
- [Model Context Protocol](https://modelcontextprotocol.io)

## Notes

- Use `--legacy-peer-deps` flag when installing Node.js dependencies due to peer dependency conflicts between different SDK versions
- The `google-generativeai` package is deprecated; future implementations should use `google-genai` instead
- All dependencies have been verified to have no known security vulnerabilities
