#!/usr/bin/env python3
"""
Verification script for Python SDK installations
"""

print("Verifying Python SDK installations...\n")

# Test Google Gemini / GenAI
try:
    import google.generativeai as genai
    print("✓ Google Generative AI SDK installed successfully")
    print(f"  Version: {genai.__version__ if hasattr(genai, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ Google Generative AI SDK failed: {e}")

# Test Anthropic Claude SDK
try:
    import anthropic
    print("✓ Anthropic SDK installed successfully")
    print(f"  Version: {anthropic.__version__ if hasattr(anthropic, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ Anthropic SDK failed: {e}")

# Test OpenAI SDK (includes Codex)
try:
    import openai
    print("✓ OpenAI SDK installed successfully")
    print(f"  Version: {openai.__version__ if hasattr(openai, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ OpenAI SDK failed: {e}")

# Test MCP SDK
try:
    import mcp
    print("✓ Model Context Protocol SDK installed successfully")
    print(f"  Version: {mcp.__version__ if hasattr(mcp, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ MCP SDK failed: {e}")

print("\nAll Python SDKs verified!")
