#!/usr/bin/env node
/**
 * Verification script for Node.js SDK installations
 */

console.log("Verifying Node.js SDK installations...\n");

const failedImports = [];

// Test Google Generative AI
try {
    require('@google/generative-ai');
    console.log("✓ Google Generative AI SDK installed successfully");
} catch (e) {
    console.log(`✗ Google Generative AI SDK failed: ${e.message}`);
    failedImports.push('@google/generative-ai');
}

// Test Anthropic SDK
try {
    require('@anthropic-ai/sdk');
    console.log("✓ Anthropic SDK installed successfully");
} catch (e) {
    console.log(`✗ Anthropic SDK failed: ${e.message}`);
    failedImports.push('@anthropic-ai/sdk');
}

// Test Claude Agent SDK
try {
    require('@anthropic-ai/claude-agent-sdk');
    console.log("✓ Claude Agent SDK installed successfully");
} catch (e) {
    console.log(`✗ Claude Agent SDK failed: ${e.message}`);
    failedImports.push('@anthropic-ai/claude-agent-sdk');
}

// Test Model Context Protocol SDK
try {
    // Try ESM import path
    require('@modelcontextprotocol/sdk/client/index.js');
    console.log("✓ Model Context Protocol SDK installed successfully");
} catch (e) {
    console.log(`✗ MCP SDK failed: ${e.message}`);
    failedImports.push('@modelcontextprotocol/sdk');
}

// Test OpenAI SDK
try {
    require('openai');
    console.log("✓ OpenAI SDK installed successfully");
} catch (e) {
    console.log(`✗ OpenAI SDK failed: ${e.message}`);
    failedImports.push('openai');
}

if (failedImports.length > 0) {
    console.log(`\n✗ Node.js SDK verification failed. ${failedImports.length} SDK(s) failed to import.`);
    process.exit(1);
} else {
    console.log("\n✓ All Node.js SDKs verified successfully!");
    process.exit(0);
}
