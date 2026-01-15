import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";

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
    const transport = new StdioClientTransport({
      command,
      args,
    });

    await this.client.connect(transport);
    return this.client;
  }

  /**
   * List available tools from the MCP server
   */
  async listTools() {
    const tools = await this.client.listTools();
    return tools;
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>) {
    const result = await this.client.callTool({ name, arguments: args });
    return result;
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
  async chat(messages: Array<{ role: string; content: string }>) {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
    });

    return completion.choices[0]?.message;
  }

  /**
   * Create an assistant (agent)
   */
  async createAssistant(name: string, instructions: string) {
    const assistant = await this.client.beta.assistants.create({
      name,
      instructions,
      model: "gpt-4",
    });

    return assistant;
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
