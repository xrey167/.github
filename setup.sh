#!/bin/bash
# Setup script for AI coding agents integration
# This script helps configure your environment for using multiple AI coding agents

set -e

echo "🤖 AI Coding Agents Setup"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python 3 installed: $PYTHON_VERSION"
else
    print_error "Python 3 not found. Please install Python 3.9 or higher."
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_warning "Node.js not found. TypeScript examples will not work."
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_warning "npm not found. TypeScript examples will not work."
fi

# Check gh CLI
if command_exists gh; then
    GH_VERSION=$(gh --version | head -n1)
    print_success "GitHub CLI installed: $GH_VERSION"
else
    print_warning "GitHub CLI not found. Installing is recommended for Copilot CLI."
    print_info "Install with: brew install gh (macOS) or sudo apt install gh (Linux)"
fi

echo ""

# 2. Setup environment file
echo "Setting up environment configuration..."
echo ""

if [ -f .env ]; then
    print_warning ".env file already exists. Skipping creation."
    print_info "If you want to reset it, delete .env and run this script again."
else
    if [ -f .env.template ]; then
        cp .env.template .env
        print_success "Created .env file from template"
        print_info "Please edit .env and add your API keys"
    else
        print_error ".env.template not found"
        exit 1
    fi
fi

echo ""

# 3. Install Python dependencies
echo "Installing Python dependencies..."
echo ""

if [ -f .github/agents/requirements.txt ]; then
    if command_exists pip3; then
        pip3 install -r .github/agents/requirements.txt
        print_success "Python dependencies installed"
    else
        print_error "pip3 not found"
        exit 1
    fi
else
    print_error "requirements.txt not found"
    exit 1
fi

echo ""

# 4. Install Node.js dependencies (optional)
if command_exists npm && [ -f .github/agents/package.json ]; then
    echo "Installing Node.js dependencies..."
    echo ""
    
    cd .github/agents
    npm install
    cd ../..
    
    print_success "Node.js dependencies installed"
    echo ""
fi

# 5. Install GitHub Copilot CLI (optional)
if command_exists gh; then
    echo "Checking GitHub Copilot CLI extension..."
    echo ""
    
    if gh extension list | grep -q "github/gh-copilot"; then
        print_success "GitHub Copilot CLI extension already installed"
    else
        print_info "Installing GitHub Copilot CLI extension..."
        gh extension install github/gh-copilot
        print_success "GitHub Copilot CLI extension installed"
    fi
    echo ""
fi

# 6. Verify API keys
echo "Verifying API key configuration..."
echo ""

if [ -f .env ]; then
    # Source .env file
    export $(grep -v '^#' .env | xargs)
    
    # Check OpenAI key
    if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "sk-..." ]; then
        print_success "OpenAI API key configured"
    else
        print_warning "OpenAI API key not configured"
    fi
    
    # Check Anthropic key
    if [ -n "$ANTHROPIC_API_KEY" ] && [ "$ANTHROPIC_API_KEY" != "sk-ant-..." ]; then
        print_success "Anthropic API key configured"
    else
        print_warning "Anthropic API key not configured"
    fi
    
    # Check Google key
    if [ -n "$GOOGLE_API_KEY" ] && [ "$GOOGLE_API_KEY" != "AIza..." ]; then
        print_success "Google API key configured"
    else
        print_warning "Google API key not configured"
    fi
fi

echo ""

# 7. Make CLI examples executable
echo "Setting up CLI examples..."
echo ""

if [ -f .github/agents/cli-example.py ]; then
    chmod +x .github/agents/cli-example.py
    print_success "Python CLI example is executable"
fi

echo ""

# 8. Test installation (optional)
echo "Testing installation..."
echo ""

read -p "Do you want to run a test with configured API keys? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f .github/agents/cli-example.py ]; then
        print_info "Testing Python CLI..."
        python3 .github/agents/cli-example.py --agent openai --prompt "Write a hello world function" 2>&1 | head -n 5
        print_success "Test completed (check output above)"
    fi
fi

echo ""

# 9. Final instructions
echo "=========================="
echo "✅ Setup Complete!"
echo "=========================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env and add your API keys if you haven't already:"
echo "   - OpenAI: https://platform.openai.com/api-keys"
echo "   - Anthropic: https://console.anthropic.com/settings/keys"
echo "   - Google: https://makersuite.google.com/app/apikey"
echo ""
echo "2. Read the documentation:"
echo "   - README.md for overview"
echo "   - .github/agents/README.md for detailed guide"
echo "   - .github/agents/BEST_PRACTICES.md for best practices"
echo ""
echo "3. Try the CLI examples:"
echo "   python3 .github/agents/cli-example.py --help"
if command_exists npx; then
    echo "   npx ts-node .github/agents/cli-example.ts --help"
fi
if command_exists gh; then
    echo "   gh copilot suggest \"your prompt\""
fi
echo ""
echo "4. Configure your IDE with Copilot"
echo ""
print_success "Happy coding with AI assistants! 🚀"
