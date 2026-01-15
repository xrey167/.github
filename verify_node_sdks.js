#!/usr/bin/env node
/**
 * Verification script for Node.js SDK installations
 */

console.log("Verifying Node.js SDK installations...\n");

// Test Google Generative AI
try {
    require('@google/generative-ai');
    console.log("✓ Google Generative AI SDK installed successfully");
} catch (e) {
    console.log(`✗ Google Generative AI SDK failed: ${e.message}`);
}

// Test Anthropic SDK
try {
    require('@anthropic-ai/sdk');
    console.log("✓ Anthropic SDK installed successfully");
} catch (e) {
    console.log(`✗ Anthropic SDK failed: ${e.message}`);
}

// Test Claude Agent SDK
try {
    const claudeAgent = require('@anthropic-ai/claude-agent-sdk');
    console.log("✓ Claude Agent SDK installed successfully");
} catch (e) {
    console.log(`✗ Claude Agent SDK failed: ${e.message}`);
}

// Test Model Context Protocol SDK
try {
    // Try ESM import path
    require('@modelcontextprotocol/sdk/client/index.js');
    console.log("✓ Model Context Protocol SDK installed successfully");
} catch (e) {
    console.log(`✗ MCP SDK failed: ${e.message}`);
}

// Test OpenAI SDK
try {
    const openai = require('openai');
    console.log("✓ OpenAI SDK installed successfully");
} catch (e) {
    console.log(`✗ OpenAI SDK failed: ${e.message}`);
}

console.log("\nAll Node.js SDKs verified!");
