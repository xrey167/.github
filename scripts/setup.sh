#!/bin/bash

# Project Setup Helper
# Usage: ./setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Project Setup${NC}"
echo "=============="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository!${NC}"
    echo "Run 'git init' first."
    exit 1
fi

# Make scripts executable
if [ -d "scripts" ]; then
    echo -e "${YELLOW}Making scripts executable...${NC}"
    find scripts -type f -name "*.sh" -exec chmod +x {} \;
    echo -e "${GREEN}✓ Scripts are now executable${NC}"
fi

# Install git hooks if they exist
if [ -d "scripts/git-hooks" ]; then
    echo ""
    echo -e "${YELLOW}Installing git hooks...${NC}"
    
    if [ -f "scripts/git-hooks/pre-commit" ]; then
        cp scripts/git-hooks/pre-commit .git/hooks/
        chmod +x .git/hooks/pre-commit
        echo -e "${GREEN}✓ Installed pre-commit hook${NC}"
    fi
    
    if [ -f "scripts/git-hooks/commit-msg" ]; then
        cp scripts/git-hooks/commit-msg .git/hooks/
        chmod +x .git/hooks/commit-msg
        echo -e "${GREEN}✓ Installed commit-msg hook${NC}"
    fi
    
    if [ -f "scripts/git-hooks/pre-push" ]; then
        cp scripts/git-hooks/pre-push .git/hooks/
        chmod +x .git/hooks/pre-push
        echo -e "${GREEN}✓ Installed pre-push hook${NC}"
    fi
fi

# Check for package manager and install dependencies
echo ""
echo -e "${YELLOW}Checking for dependencies...${NC}"

if [ -f "package.json" ]; then
    echo "Found package.json"
    if command -v npm &> /dev/null; then
        echo "Installing npm dependencies..."
        npm install
        echo -e "${GREEN}✓ npm dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠ npm not found, skipping npm install${NC}"
    fi
fi

if [ -f "requirements.txt" ]; then
    echo "Found requirements.txt"
    if command -v pip &> /dev/null; then
        echo "Installing Python dependencies..."
        pip install -r requirements.txt
        echo -e "${GREEN}✓ Python dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠ pip not found, skipping pip install${NC}"
    fi
fi

if [ -f "go.mod" ]; then
    echo "Found go.mod"
    if command -v go &> /dev/null; then
        echo "Installing Go dependencies..."
        go mod download
        echo -e "${GREEN}✓ Go dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠ go not found, skipping go mod download${NC}"
    fi
fi

# Create .env from .env.example if it exists
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo ""
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please update .env with your configuration${NC}"
fi

# Setup complete
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Review and update configuration files"
echo "  2. Create a feature branch: ./scripts/git-branch.sh feature <name>"
echo "  3. Start developing!"
