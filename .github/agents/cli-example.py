#!/usr/bin/env python3
"""
Example script for generating code with multiple AI agents
Demonstrates CLI usage with API key authentication
"""

import os
import sys
from typing import Optional, Dict, Any
from dataclasses import dataclass

# Import AI SDKs
try:
    from openai import OpenAI
    from anthropic import Anthropic
    import google.generativeai as genai
except ImportError as e:
    print(f"Error: Missing required SDK. Run: pip install -r .github/agents/requirements.txt")
    print(f"Details: {e}")
    sys.exit(1)


@dataclass
class AgentConfig:
    """Configuration for an AI agent"""
    name: str
    api_key_env: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 2048


class AIAgentManager:
    """Manager for multiple AI coding agents"""
    
    def __init__(self):
        self.configs = {
            'openai': AgentConfig(
                name='OpenAI Codex',
                api_key_env='OPENAI_API_KEY',
                model='gpt-4-turbo-preview',
                temperature=0.7,
                max_tokens=2048
            ),
            'anthropic': AgentConfig(
                name='Anthropic Claude',
                api_key_env='ANTHROPIC_API_KEY',
                model='claude-3-sonnet-20240229',
                temperature=0.7,
                max_tokens=4096
            ),
            'google': AgentConfig(
                name='Google Gemini',
                api_key_env='GOOGLE_API_KEY',
                model='gemini-pro',
                temperature=0.7,
                max_tokens=2048
            )
        }
        
        # Initialize clients
        self.openai_client = None
        self.anthropic_client = None
        self.gemini_configured = False
        
        self._setup_clients()
    
    def _setup_clients(self):
        """Initialize API clients with environment variables"""
        
        # OpenAI
        if os.getenv(self.configs['openai'].api_key_env):
            self.openai_client = OpenAI(
                api_key=os.getenv(self.configs['openai'].api_key_env)
            )
            print(f"✓ {self.configs['openai'].name} initialized")
        else:
            print(f"⚠ {self.configs['openai'].name} not configured (missing {self.configs['openai'].api_key_env})")
        
        # Anthropic
        if os.getenv(self.configs['anthropic'].api_key_env):
            self.anthropic_client = Anthropic(
                api_key=os.getenv(self.configs['anthropic'].api_key_env)
            )
            print(f"✓ {self.configs['anthropic'].name} initialized")
        else:
            print(f"⚠ {self.configs['anthropic'].name} not configured (missing {self.configs['anthropic'].api_key_env})")
        
        # Google Gemini
        if os.getenv(self.configs['google'].api_key_env):
            genai.configure(api_key=os.getenv(self.configs['google'].api_key_env))
            self.gemini_configured = True
            print(f"✓ {self.configs['google'].name} initialized")
        else:
            print(f"⚠ {self.configs['google'].name} not configured (missing {self.configs['google'].api_key_env})")
    
    def generate_code_openai(self, prompt: str) -> Optional[str]:
        """Generate code using OpenAI"""
        if not self.openai_client:
            return None
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.configs['openai'].model,
                messages=[
                    {"role": "system", "content": "You are an expert coding assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.configs['openai'].temperature,
                max_tokens=self.configs['openai'].max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error with OpenAI: {e}")
            return None
    
    def generate_code_anthropic(self, prompt: str) -> Optional[str]:
        """Generate code using Anthropic Claude"""
        if not self.anthropic_client:
            return None
        
        try:
            message = self.anthropic_client.messages.create(
                model=self.configs['anthropic'].model,
                max_tokens=self.configs['anthropic'].max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text
        except Exception as e:
            print(f"Error with Anthropic: {e}")
            return None
    
    def generate_code_gemini(self, prompt: str) -> Optional[str]:
        """Generate code using Google Gemini"""
        if not self.gemini_configured:
            return None
        
        try:
            model = genai.GenerativeModel(self.configs['google'].model)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error with Gemini: {e}")
            return None
    
    def generate_code(self, prompt: str, agent: str = 'openai') -> Optional[str]:
        """Generate code using specified agent"""
        generators = {
            'openai': self.generate_code_openai,
            'anthropic': self.generate_code_anthropic,
            'google': self.generate_code_gemini
        }
        
        generator = generators.get(agent)
        if not generator:
            print(f"Unknown agent: {agent}")
            return None
        
        return generator(prompt)
    
    def compare_agents(self, prompt: str) -> Dict[str, Optional[str]]:
        """Compare responses from all available agents"""
        results = {}
        
        print("\n" + "="*80)
        print("Comparing AI Agents")
        print("="*80)
        
        for agent_name in ['openai', 'anthropic', 'google']:
            print(f"\nGenerating with {self.configs[agent_name].name}...")
            result = self.generate_code(prompt, agent_name)
            results[agent_name] = result
            
            if result:
                print(f"✓ Response received ({len(result)} characters)")
            else:
                print(f"✗ No response")
        
        return results


def main():
    """Main CLI function"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='AI Coding Agent CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate code with OpenAI
  %(prog)s --agent openai --prompt "Write a Python function to sort a list"
  
  # Compare responses from all agents
  %(prog)s --compare --prompt "Write a REST API handler"
  
  # Use from stdin
  echo "Write a binary search function" | %(prog)s --agent anthropic --stdin
  
Environment Variables:
  OPENAI_API_KEY      - OpenAI API key
  ANTHROPIC_API_KEY   - Anthropic API key
  GOOGLE_API_KEY      - Google API key
        """
    )
    
    parser.add_argument('--agent', choices=['openai', 'anthropic', 'google'],
                       default='openai', help='AI agent to use')
    parser.add_argument('--prompt', type=str, help='Prompt for code generation')
    parser.add_argument('--compare', action='store_true',
                       help='Compare responses from all agents')
    parser.add_argument('--stdin', action='store_true',
                       help='Read prompt from stdin')
    parser.add_argument('--output', type=str, help='Output file (default: stdout)')
    
    args = parser.parse_args()
    
    # Get prompt
    if args.stdin:
        prompt = sys.stdin.read()
    elif args.prompt:
        prompt = args.prompt
    else:
        parser.print_help()
        print("\nError: Either --prompt or --stdin is required")
        sys.exit(1)
    
    # Initialize manager
    manager = AIAgentManager()
    
    # Generate code
    if args.compare:
        results = manager.compare_agents(prompt)
        
        print("\n" + "="*80)
        print("RESULTS")
        print("="*80)
        
        for agent, result in results.items():
            print(f"\n## {manager.configs[agent].name}\n")
            if result:
                print(result)
            else:
                print("[No response]")
            print("\n" + "-"*80)
    else:
        result = manager.generate_code(prompt, args.agent)
        
        if result:
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(result)
                print(f"Output written to {args.output}")
            else:
                print(result)
        else:
            print(f"Failed to generate code with {args.agent}")
            sys.exit(1)


if __name__ == '__main__':
    main()
