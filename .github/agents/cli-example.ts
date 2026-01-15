/**
 * Example TypeScript/Node.js script for using multiple AI coding agents
 * Demonstrates CLI usage with OAuth/API key authentication
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface AgentConfig {
  name: string;
  apiKeyEnv: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

class AIAgentManager {
  private configs: Record<string, AgentConfig>;
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    this.configs = {
      openai: {
        name: 'OpenAI Codex',
        apiKeyEnv: 'OPENAI_API_KEY',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 2048,
      },
      anthropic: {
        name: 'Anthropic Claude',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 4096,
      },
      google: {
        name: 'Google Gemini',
        apiKeyEnv: 'GOOGLE_API_KEY',
        model: 'gemini-pro',
        temperature: 0.7,
        maxTokens: 2048,
      },
    };

    this.setupClients();
  }

  private setupClients(): void {
    // OpenAI
    const openaiKey = process.env[this.configs.openai.apiKeyEnv];
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
      console.log(`✓ ${this.configs.openai.name} initialized`);
    } else {
      console.log(
        `⚠ ${this.configs.openai.name} not configured (missing ${this.configs.openai.apiKeyEnv})`
      );
    }

    // Anthropic
    const anthropicKey = process.env[this.configs.anthropic.apiKeyEnv];
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
      console.log(`✓ ${this.configs.anthropic.name} initialized`);
    } else {
      console.log(
        `⚠ ${this.configs.anthropic.name} not configured (missing ${this.configs.anthropic.apiKeyEnv})`
      );
    }

    // Google Gemini
    const geminiKey = process.env[this.configs.google.apiKeyEnv];
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      console.log(`✓ ${this.configs.google.name} initialized`);
    } else {
      console.log(
        `⚠ ${this.configs.google.name} not configured (missing ${this.configs.google.apiKeyEnv})`
      );
    }
  }

  async generateCodeOpenAI(prompt: string): Promise<string | null> {
    if (!this.openaiClient) return null;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: this.configs.openai.model,
        messages: [
          { role: 'system', content: 'You are an expert coding assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: this.configs.openai.temperature,
        max_tokens: this.configs.openai.maxTokens,
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error(`Error with OpenAI:`, error);
      return null;
    }
  }

  async generateCodeAnthropic(prompt: string): Promise<string | null> {
    if (!this.anthropicClient) return null;

    try {
      const message = await this.anthropicClient.messages.create({
        model: this.configs.anthropic.model,
        max_tokens: this.configs.anthropic.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      return message.content[0].type === 'text' ? message.content[0].text : null;
    } catch (error) {
      console.error(`Error with Anthropic:`, error);
      return null;
    }
  }

  async generateCodeGemini(prompt: string): Promise<string | null> {
    if (!this.geminiClient) return null;

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: this.configs.google.model,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Error with Gemini:`, error);
      return null;
    }
  }

  async generateCode(prompt: string, agent: string): Promise<string | null> {
    const generators: Record<string, (p: string) => Promise<string | null>> = {
      openai: this.generateCodeOpenAI.bind(this),
      anthropic: this.generateCodeAnthropic.bind(this),
      google: this.generateCodeGemini.bind(this),
    };

    const generator = generators[agent];
    if (!generator) {
      console.error(`Unknown agent: ${agent}`);
      return null;
    }

    return generator(prompt);
  }

  async compareAgents(prompt: string): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};

    console.log('\n' + '='.repeat(80));
    console.log('Comparing AI Agents');
    console.log('='.repeat(80));

    for (const agentName of ['openai', 'anthropic', 'google']) {
      console.log(`\nGenerating with ${this.configs[agentName].name}...`);
      const result = await this.generateCode(prompt, agentName);
      results[agentName] = result;

      if (result) {
        console.log(`✓ Response received (${result.length} characters)`);
      } else {
        console.log(`✗ No response`);
      }
    }

    return results;
  }
}

// CLI Implementation
async function main() {
  const args = process.argv.slice(2);
  
  // Simple argument parsing
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
  };
  
  const hasFlag = (flag: string): boolean => args.includes(flag);

  if (hasFlag('--help') || hasFlag('-h')) {
    console.log(`
AI Coding Agent CLI (TypeScript)

Usage:
  ts-node cli-example.ts [options]

Options:
  --agent <name>      AI agent to use (openai, anthropic, google) [default: openai]
  --prompt <text>     Prompt for code generation
  --compare           Compare responses from all agents
  --help, -h          Show this help message

Examples:
  # Generate code with OpenAI
  ts-node cli-example.ts --agent openai --prompt "Write a TypeScript function to sort an array"
  
  # Compare responses from all agents
  ts-node cli-example.ts --compare --prompt "Write a REST API handler"

Environment Variables:
  OPENAI_API_KEY      - OpenAI API key
  ANTHROPIC_API_KEY   - Anthropic API key
  GOOGLE_API_KEY      - Google API key
    `);
    process.exit(0);
  }

  const agent = getArg('--agent') || 'openai';
  const prompt = getArg('--prompt');
  const compare = hasFlag('--compare');

  if (!prompt) {
    console.error('Error: --prompt is required');
    process.exit(1);
  }

  const manager = new AIAgentManager();

  if (compare) {
    const results = await manager.compareAgents(prompt);

    console.log('\n' + '='.repeat(80));
    console.log('RESULTS');
    console.log('='.repeat(80));

    for (const [agentName, result] of Object.entries(results)) {
      console.log(`\n## ${manager['configs'][agentName].name}\n`);
      if (result) {
        console.log(result);
      } else {
        console.log('[No response]');
      }
      console.log('\n' + '-'.repeat(80));
    }
  } else {
    const result = await manager.generateCode(prompt, agent);

    if (result) {
      console.log(result);
    } else {
      console.error(`Failed to generate code with ${agent}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { AIAgentManager };
