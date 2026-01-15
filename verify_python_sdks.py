#!/usr/bin/env python3
"""
Verification script for Python SDK installations
"""
import sys

print("Verifying Python SDK installations...\n")

failed_imports = []

# Test Google Gemini / GenAI
try:
    import google.generativeai as genai
    print("✓ Google Generative AI SDK installed successfully")
    print(f"  Version: {genai.__version__ if hasattr(genai, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ Google Generative AI SDK failed: {e}")
    failed_imports.append("google-generativeai")

# Test Anthropic Claude SDK
try:
    import anthropic
    print("✓ Anthropic SDK installed successfully")
    print(f"  Version: {anthropic.__version__ if hasattr(anthropic, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ Anthropic SDK failed: {e}")
    failed_imports.append("anthropic")

# Test OpenAI SDK (e.g., GPT-3.5-turbo, GPT-4)
try:
    import openai
    print("✓ OpenAI SDK installed successfully")
    print(f"  Version: {openai.__version__ if hasattr(openai, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ OpenAI SDK failed: {e}")
    failed_imports.append("openai")

# Test MCP SDK
try:
    import mcp
    print("✓ Model Context Protocol SDK installed successfully")
    print(f"  Version: {mcp.__version__ if hasattr(mcp, '__version__') else 'Available'}")
except ImportError as e:
    print(f"✗ MCP SDK failed: {e}")
    failed_imports.append("mcp")

if failed_imports:
    print(f"\n✗ Python SDK verification failed. {len(failed_imports)} SDK(s) failed to import.")
    sys.exit(1)
else:
    print("\n✓ All Python SDKs verified successfully!")
    sys.exit(0)
