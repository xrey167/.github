#!/bin/bash

# Git Status Helper - Enhanced git status with branch info
# Usage: ./git-status.sh

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/git-utils.sh"

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Get main branch name
MAIN_BRANCH=$(get_main_branch)

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Git Repository Status          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Branch information
echo -e "${CYAN}Branch Information:${NC}"
echo -e "  Current Branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo -e "  Main Branch:    ${GREEN}$MAIN_BRANCH${NC}"
echo ""

# Check if branch is ahead/behind
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
    git fetch origin "$MAIN_BRANCH" --quiet 2>/dev/null || true
    
    AHEAD=$(git rev-list --count origin/"$MAIN_BRANCH".."$CURRENT_BRANCH" 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count "$CURRENT_BRANCH"..origin/"$MAIN_BRANCH" 2>/dev/null || echo "0")
    
    if [ "$AHEAD" -gt 0 ]; then
        echo -e "  ${GREEN}↑ $AHEAD commit(s) ahead of $MAIN_BRANCH${NC}"
    fi
    if [ "$BEHIND" -gt 0 ]; then
        echo -e "  ${YELLOW}↓ $BEHIND commit(s) behind $MAIN_BRANCH${NC}"
        echo -e "  ${YELLOW}Consider running: ./scripts/git-sync.sh${NC}"
    fi
    echo ""
fi

# Repository status
echo -e "${CYAN}Working Directory Status:${NC}"
git status --short

# Check if working directory is clean
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✓ Working directory clean${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠ You have uncommitted changes${NC}"
fi

echo ""

# Show recent commits
echo -e "${CYAN}Recent Commits (last 5):${NC}"
git log --oneline --decorate -5 --color=always

echo ""
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Show helpful commands
echo -e "${CYAN}Quick Commands:${NC}"
echo "  Create branch:  ./scripts/git-branch.sh <type> <name>"
echo "  Sync branch:    ./scripts/git-sync.sh"
echo "  Cleanup:        ./scripts/git-cleanup.sh"
