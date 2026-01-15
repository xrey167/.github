# AI Coding Agents Best Practices

## Overview
This document provides best practices for integrating and using multiple AI coding agents (GitHub Copilot, OpenAI Codex, Anthropic Claude, and Google Gemini) in your development workflow.

## Table of Contents
1. [Setup and Configuration](#setup-and-configuration)
2. [Authentication and Security](#authentication-and-security)
3. [Choosing the Right Agent](#choosing-the-right-agent)
4. [Prompt Engineering](#prompt-engineering)
5. [Code Review Workflow](#code-review-workflow)
6. [CI/CD Integration](#cicd-integration)
7. [Cost Management](#cost-management)
8. [Security Considerations](#security-considerations)

## Setup and Configuration

### Initial Setup

1. **Install GitHub Copilot CLI**
   ```bash
   gh extension install github/gh-copilot
   gh copilot config
   ```

2. **Set up API Keys**
   ```bash
   # Create .env file (add to .gitignore)
   cat > .env << EOF
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AIza...
   EOF
   ```

3. **Install SDKs**
   ```bash
   # Python
   pip install -r .github/agents/requirements.txt
   
   # TypeScript/Node.js
   npm install --save-dev $(cat .github/agents/package.json | jq -r '.devDependencies | keys[]')
   ```

4. **Configure Repository**
   - Add `.github/copilot-instructions.md` for custom instructions
   - Set up `.github/copilot/environment.json` for dependencies
   - Configure `.github/copilot/mcp-config.json` for MCP integration

### Environment Variables

Create a `.env.template` for your team:
```bash
# AI Coding Agents Configuration

# GitHub Copilot (uses GitHub auth)
# No additional key needed

# OpenAI Codex
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GOOGLE_API_KEY=AIza...
GOOGLE_PROJECT_ID=your-project-id
```

## Authentication and Security

### API Key Management

#### Best Practices
1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate keys regularly** (every 90 days minimum)
4. **Use separate keys** for development and production
5. **Set usage limits** to prevent unexpected costs
6. **Monitor usage** regularly

#### Secure Storage

**For Development:**
```bash
# Use direnv for automatic environment loading
echo "export OPENAI_API_KEY=sk-..." > .envrc
direnv allow

# Or use encrypted .env files
gpg --encrypt .env
```

**For CI/CD:**
```bash
# GitHub Secrets
gh secret set OPENAI_API_KEY
gh secret set ANTHROPIC_API_KEY
gh secret set GOOGLE_API_KEY

# Verify secrets are set
gh secret list
```

**For Production:**
```bash
# Use secret management services
# AWS Secrets Manager
aws secretsmanager create-secret --name openai-key --secret-string "sk-..."

# Google Secret Manager
echo -n "sk-..." | gcloud secrets create openai-key --data-file=-

# Azure Key Vault
az keyvault secret set --vault-name mykeyvault --name openai-key --value "sk-..."
```

### OAuth Integration

For services that support OAuth:

```python
# Example OAuth flow for OpenAI (when available)
from authlib.integrations.requests_client import OAuth2Session

def get_openai_token():
    client = OAuth2Session(
        client_id=os.getenv('OPENAI_CLIENT_ID'),
        client_secret=os.getenv('OPENAI_CLIENT_SECRET'),
        scope='api'
    )
    token = client.fetch_token(
        'https://api.openai.com/oauth/token',
        grant_type='client_credentials'
    )
    return token['access_token']
```

## Choosing the Right Agent

### Agent Strengths

| Task | Best Agent | Reason |
|------|-----------|---------|
| Inline code completion | GitHub Copilot | Fastest, context-aware |
| Complex algorithms | OpenAI Codex (GPT-4) | Best reasoning |
| Code review | Claude Sonnet | Detailed analysis |
| Refactoring | Claude Opus | Architectural thinking |
| Documentation | Gemini Pro | Clear explanations |
| Multi-modal (diagrams) | Gemini Vision | Image understanding |
| Quick fixes | GitHub Copilot | Integrated workflow |
| Batch processing | Gemini Flash | Cost-effective |

### Decision Matrix

```python
def choose_agent(task_type, complexity, budget):
    """
    Helper function to choose the right AI agent
    
    Args:
        task_type: 'completion', 'review', 'refactor', 'docs', 'analysis'
        complexity: 'low', 'medium', 'high'
        budget: 'low', 'medium', 'high'
    
    Returns:
        str: Recommended agent name
    """
    if task_type == 'completion':
        return 'copilot'
    
    if task_type == 'review':
        if complexity == 'high':
            return 'claude-opus'
        return 'claude-sonnet'
    
    if task_type == 'refactor':
        if complexity == 'high':
            return 'claude-opus'
        return 'gpt-4'
    
    if task_type == 'docs':
        if budget == 'low':
            return 'gemini-flash'
        return 'gemini-pro'
    
    if task_type == 'analysis':
        if complexity == 'high' and budget == 'high':
            return 'claude-opus'
        if budget == 'low':
            return 'gemini-flash'
        return 'gpt-4-turbo'
    
    return 'copilot'  # Default
```

## Prompt Engineering

### General Principles

1. **Be Specific**: Include exact requirements
2. **Provide Context**: Mention language, framework, version
3. **Set Constraints**: Specify style, patterns, limitations
4. **Request Explanation**: Ask for comments and reasoning
5. **Iterate**: Refine based on responses

### Effective Prompt Templates

#### Code Generation
```
Write a [LANGUAGE] [COMPONENT_TYPE] that:
- [REQUIREMENT_1]
- [REQUIREMENT_2]
- [REQUIREMENT_3]

Technical constraints:
- Language version: [VERSION]
- Framework: [FRAMEWORK]
- Style guide: [STYLE_GUIDE]

Include:
- Type hints/annotations
- Docstrings/comments
- Error handling
- Unit test example
```

#### Code Review
```
Review this [LANGUAGE] code for:
1. Security vulnerabilities
2. Performance issues
3. Best practices violations
4. Potential bugs
5. Refactoring opportunities

Code:
```[LANGUAGE]
[CODE_HERE]
```

Project context:
- Framework: [FRAMEWORK]
- Style guide: [STYLE_GUIDE]
- Target audience: [AUDIENCE]

Provide specific, actionable feedback with examples.
```

#### Refactoring
```
Refactor this [LANGUAGE] code to:
- Improve [ASPECT_1]
- Apply [PATTERN_1]
- Follow [PRINCIPLE_1]

Current code:
```[LANGUAGE]
[CODE_HERE]
```

Requirements:
- Maintain backward compatibility: [YES/NO]
- Update tests: [YES/NO]
- Target version: [VERSION]

Show before/after with explanation of changes.
```

### Language-Specific Prompts

#### Python
```
Write a Python 3.11+ function that [DESCRIPTION]

Requirements:
- Use type hints with PEP 604 syntax (X | Y)
- Google-style docstring
- Handle edge cases (None, empty, invalid input)
- Use modern Python features (match/case, walrus operator if appropriate)
- Follow PEP 8
- Include pytest test example

Context: This is part of a [PROJECT_TYPE] using [FRAMEWORK].
```

#### TypeScript
```
Write a TypeScript function that [DESCRIPTION]

Requirements:
- Strict type safety (no any)
- JSDoc comments
- Handle null/undefined properly
- Use modern ES2022+ features
- Follow Airbnb style guide
- Include Jest test example

Context: This is a [PROJECT_TYPE] using [FRAMEWORK] [VERSION].
```

## Code Review Workflow

### Pre-commit Review

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Get staged Python files
PYTHON_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.py$')

if [ -n "$PYTHON_FILES" ]; then
    echo "Reviewing Python changes with AI..."
    
    for file in $PYTHON_FILES; do
        # Get diff for file
        DIFF=$(git diff --cached $file)
        
        # Quick review with Gemini (fast and cheap)
        python3 << EOF
import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-flash')

response = model.generate_content(f"""
Quick security and style check for this Python code change:

{'''$DIFF'''}

Flag only critical issues that should block commit.
""")

if "CRITICAL" in response.text.upper():
    print(response.text)
    exit(1)
EOF
    done
fi
```

### Pull Request Review

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review

on: 
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install openai anthropic google-generativeai
      
      - name: Run AI Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
        run: |
          python .github/scripts/ai-review.py \
            --pr-number ${{ github.event.pull_request.number }} \
            --base ${{ github.event.pull_request.base.sha }} \
            --head ${{ github.event.pull_request.head.sha }}
```

### Review Script Example

```python
#!/usr/bin/env python3
"""
Multi-agent code review script
Uses different AI agents for different aspects
"""

import os
import sys
import subprocess
from typing import List, Dict
import anthropic
import google.generativeai as genai
from openai import OpenAI

def get_diff(base: str, head: str) -> str:
    """Get git diff between two commits"""
    return subprocess.check_output(
        ['git', 'diff', base, head],
        text=True
    )

def security_review(diff: str) -> Dict:
    """Security-focused review with Claude"""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    message = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""
            Security review of code changes:
            
            {diff}
            
            Check for:
            - SQL injection vulnerabilities
            - XSS vulnerabilities
            - Authentication/authorization issues
            - Sensitive data exposure
            - Unsafe dependencies
            
            Report only confirmed security issues.
            """
        }]
    )
    
    return {"type": "security", "content": message.content[0].text}

def performance_review(diff: str) -> Dict:
    """Performance review with GPT-4"""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[{
            "role": "user",
            "content": f"""
            Performance review of code changes:
            
            {diff}
            
            Identify:
            - Inefficient algorithms
            - Memory leaks
            - Database query issues
            - Unnecessary computations
            - Caching opportunities
            
            Provide specific optimization suggestions.
            """
        }]
    )
    
    return {"type": "performance", "content": response.choices[0].message.content}

def style_review(diff: str) -> Dict:
    """Style and best practices review with Gemini"""
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel('gemini-flash')
    
    response = model.generate_content(f"""
    Code style and best practices review:
    
    {diff}
    
    Check:
    - Naming conventions
    - Code organization
    - Documentation
    - Error handling
    - Test coverage
    
    Suggest improvements following language best practices.
    """)
    
    return {"type": "style", "content": response.text}

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--pr-number', required=True)
    args = parser.parse_args()
    
    # Get diff
    diff = get_diff(args.base, args.head)
    
    if not diff.strip():
        print("No changes to review")
        return
    
    # Run parallel reviews
    print("Running multi-agent code review...")
    
    reviews = []
    reviews.append(security_review(diff))
    reviews.append(performance_review(diff))
    reviews.append(style_review(diff))
    
    # Generate report
    print("\n" + "="*80)
    print("AI CODE REVIEW REPORT")
    print("="*80 + "\n")
    
    for review in reviews:
        print(f"\n## {review['type'].upper()} REVIEW\n")
        print(review['content'])
        print("\n" + "-"*80)
    
    # Post to PR (using gh CLI)
    # subprocess.run([
    #     'gh', 'pr', 'comment', args.pr_number,
    #     '--body', format_report(reviews)
    # ])

if __name__ == '__main__':
    main()
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ai-agents.yml
name: AI Coding Agents

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint-with-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: AI-powered linting
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
        run: |
          python .github/scripts/ai-lint.py
  
  test-with-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate tests with AI
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python .github/scripts/generate-tests.py
      
      - name: Run tests
        run: pytest
  
  docs-with-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Update documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          python .github/scripts/update-docs.py
```

## Cost Management

### Cost Tracking

```python
import os
from datetime import datetime
import json

class AIUsageTracker:
    def __init__(self):
        self.usage_file = '.ai-usage.json'
        self.usage = self.load_usage()
    
    def load_usage(self):
        if os.path.exists(self.usage_file):
            with open(self.usage_file) as f:
                return json.load(f)
        return {}
    
    def track(self, agent: str, tokens_in: int, tokens_out: int):
        date = datetime.now().strftime('%Y-%m-%d')
        if date not in self.usage:
            self.usage[date] = {}
        if agent not in self.usage[date]:
            self.usage[date][agent] = {'input': 0, 'output': 0, 'cost': 0}
        
        self.usage[date][agent]['input'] += tokens_in
        self.usage[date][agent]['output'] += tokens_out
        self.usage[date][agent]['cost'] += self.calculate_cost(
            agent, tokens_in, tokens_out
        )
        
        self.save_usage()
    
    def calculate_cost(self, agent: str, tokens_in: int, tokens_out: int) -> float:
        # Approximate costs per 1K tokens
        costs = {
            'gpt-4-turbo': (0.01, 0.03),
            'gpt-4': (0.03, 0.06),
            'gpt-3.5': (0.0005, 0.0015),
            'claude-opus': (0.015, 0.075),
            'claude-sonnet': (0.003, 0.015),
            'claude-haiku': (0.00025, 0.00125),
            'gemini-pro': (0, 0),  # Currently free
            'gemini-flash': (0, 0),
        }
        
        rates = costs.get(agent, (0, 0))
        return (tokens_in / 1000 * rates[0]) + (tokens_out / 1000 * rates[1])
    
    def save_usage(self):
        with open(self.usage_file, 'w') as f:
            json.dump(self.usage, f, indent=2)
    
    def report(self):
        total_cost = 0
        for date, agents in self.usage.items():
            print(f"\n{date}:")
            for agent, data in agents.items():
                print(f"  {agent}:")
                print(f"    Input tokens: {data['input']:,}")
                print(f"    Output tokens: {data['output']:,}")
                print(f"    Cost: ${data['cost']:.4f}")
                total_cost += data['cost']
        
        print(f"\nTotal cost: ${total_cost:.2f}")
```

### Budget Alerts

```python
def check_budget(tracker: AIUsageTracker, daily_limit: float = 10.0):
    """Alert if daily budget exceeded"""
    today = datetime.now().strftime('%Y-%m-%d')
    if today in tracker.usage:
        daily_cost = sum(
            agent['cost'] 
            for agent in tracker.usage[today].values()
        )
        if daily_cost > daily_limit:
            raise Exception(f"Daily budget exceeded: ${daily_cost:.2f}")
```

## Security Considerations

### Input Validation

```python
def sanitize_prompt(prompt: str) -> str:
    """Remove sensitive information from prompts"""
    import re
    
    # Remove API keys
    prompt = re.sub(r'sk-[a-zA-Z0-9]{32,}', '[REDACTED]', prompt)
    
    # Remove AWS keys
    prompt = re.sub(r'AKIA[0-9A-Z]{16}', '[REDACTED]', prompt)
    
    # Remove private IPs
    prompt = re.sub(r'10\.\d+\.\d+\.\d+', '[REDACTED]', prompt)
    prompt = re.sub(r'192\.168\.\d+\.\d+', '[REDACTED]', prompt)
    
    # Remove email addresses
    prompt = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 
                    '[EMAIL]', prompt)
    
    return prompt
```

### Output Validation

```python
def validate_generated_code(code: str) -> bool:
    """Check generated code for security issues"""
    dangerous_patterns = [
        r'eval\s*\(',
        r'exec\s*\(',
        r'__import__\s*\(',
        r'subprocess\.call\(',
        r'os\.system\(',
        r'\.innerHTML\s*=',
        r'dangerouslySetInnerHTML',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, code):
            print(f"Warning: Potentially dangerous pattern found: {pattern}")
            return False
    
    return True
```

### Rate Limiting

```python
from functools import wraps
import time

def rate_limit(calls_per_minute: int):
    """Decorator to limit API calls"""
    min_interval = 60.0 / calls_per_minute
    last_called = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            left_to_wait = min_interval - elapsed
            if left_to_wait > 0:
                time.sleep(left_to_wait)
            
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator

@rate_limit(calls_per_minute=10)
def call_ai_agent(prompt: str):
    """Rate-limited AI agent call"""
    pass
```

## Monitoring and Logging

### Logging Setup

```python
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ai-agents.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('ai-agents')

def log_ai_call(agent: str, prompt: str, response: str, 
                tokens_used: int, duration: float):
    """Log AI agent interaction"""
    logger.info(
        f"Agent: {agent} | "
        f"Tokens: {tokens_used} | "
        f"Duration: {duration:.2f}s | "
        f"Prompt length: {len(prompt)} | "
        f"Response length: {len(response)}"
    )
```

## Troubleshooting

### Common Issues and Solutions

1. **Rate Limiting**
   - Implement exponential backoff
   - Use multiple API keys
   - Cache responses
   - Choose faster models

2. **Context Length Exceeded**
   - Split large files
   - Summarize previous context
   - Use chunking strategies
   - Choose models with larger context

3. **Inconsistent Results**
   - Lower temperature setting
   - Add more specific constraints
   - Use examples in prompt
   - Try different models

4. **High Costs**
   - Use cheaper models for simple tasks
   - Implement caching
   - Set token limits
   - Monitor usage closely

## Resources

### Documentation
- [GitHub Copilot Docs](https://docs.github.com/copilot)
- [OpenAI Platform](https://platform.openai.com/docs)
- [Anthropic Docs](https://docs.anthropic.com)
- [Google AI](https://ai.google.dev)

### Community
- [GitHub Copilot Community](https://github.com/community/community/discussions/categories/copilot)
- [OpenAI Forum](https://community.openai.com)
- [Anthropic Discord](https://discord.gg/anthropic)

### Tools
- [GitHub CLI](https://cli.github.com)
- [MCP Servers](https://github.com/modelcontextprotocol)
- [AI Code Review Tools](https://github.com/topics/ai-code-review)
