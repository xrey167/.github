import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Example MCP Client Setup
 * This demonstrates how to set up an MCP client for GitHub Copilot Agent Mode
 */
export class MCPClient {
  private client: Client;

  constructor() {
    this.client = new Client(
      {
        name: "github-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to an MCP server using stdio transport
   */
  async connect(command: string, args: string[]) {
    try {
      const transport = new StdioClientTransport({
        command,
        args,
      });

      await this.client.connect(transport);
      return this.client;
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools() {
    try {
      const tools = await this.client.listTools();
      return tools;
    } catch (error) {
      throw new Error(`Failed to list tools: ${error}`);
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>) {
    try {
      const result = await this.client.callTool({ name, arguments: args });
      return result;
    } catch (error) {
      throw new Error(`Failed to call tool "${name}": ${error}`);
    }
  }
}

/**
 * Example OpenAI Agents SDK Setup
 * This demonstrates how to set up an OpenAI agent
 */
export class OpenAIAgent {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Create a chat completion
   */
  async chat(messages: ChatCompletionMessageParam[]) {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: messages,
      });

      if (!completion.choices[0]?.message) {
        throw new Error("No response received from OpenAI");
      }

      return completion.choices[0].message;
    } catch (error) {
      throw new Error(`Failed to create chat completion: ${error}`);
    }
  }

  /**
   * Create an assistant (agent)
   */
  async createAssistant(name: string, instructions: string) {
    try {
      const assistant = await this.client.beta.assistants.create({
        name,
        instructions,
        model: "gpt-4",
      });

      return assistant;
    } catch (error) {
      throw new Error(`Failed to create assistant: ${error}`);
    }
  }
}

/**
 * Example usage combining MCP and OpenAI
 */
export async function example() {
  // Initialize MCP client
  const mcpClient = new MCPClient();
  
  // Initialize OpenAI agent
  const openaiAgent = new OpenAIAgent();

  console.log("MCP and OpenAI Agents SDK initialized successfully!");
  
  return { mcpClient, openaiAgent };
}
