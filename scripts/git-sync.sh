#!/bin/bash

# Git Sync Helper - Sync current branch with main/master
# Usage: ./git-sync.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Get main branch name
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

# Check if we're on main branch
if [ "$CURRENT_BRANCH" == "$MAIN_BRANCH" ]; then
    echo -e "${YELLOW}You are on $MAIN_BRANCH. Pulling latest changes...${NC}"
    git pull origin "$MAIN_BRANCH"
    echo -e "${GREEN}✓ $MAIN_BRANCH updated!${NC}"
    exit 0
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes!${NC}"
    echo "Please commit or stash your changes first:"
    echo "  git add ."
    echo "  git commit -m 'Your message'"
    echo "  OR"
    echo "  git stash"
    exit 1
fi

echo -e "${YELLOW}Syncing '$CURRENT_BRANCH' with '$MAIN_BRANCH'...${NC}"

# Fetch latest changes
echo "Fetching latest changes..."
git fetch origin

# Update main branch
echo "Updating local $MAIN_BRANCH..."
git checkout "$MAIN_BRANCH"
git pull origin "$MAIN_BRANCH"

# Go back to feature branch
echo "Switching back to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

# Rebase or merge
echo ""
echo "How do you want to sync?"
echo "  1) Rebase (recommended for clean history)"
echo "  2) Merge (preserves branch history)"
read -p "Choose (1 or 2): " -n 1 -r
echo

if [[ $REPLY == "1" ]]; then
    echo -e "${YELLOW}Rebasing...${NC}"
    if git rebase "$MAIN_BRANCH"; then
        echo -e "${GREEN}✓ Rebase successful!${NC}"
        echo ""
        echo "To push your changes, use:"
        echo "  git push --force-with-lease origin $CURRENT_BRANCH"
    else
        echo -e "${RED}Rebase conflicts detected!${NC}"
        echo "Resolve conflicts, then run:"
        echo "  git rebase --continue"
        exit 1
    fi
elif [[ $REPLY == "2" ]]; then
    echo -e "${YELLOW}Merging...${NC}"
    if git merge "$MAIN_BRANCH"; then
        echo -e "${GREEN}✓ Merge successful!${NC}"
        echo ""
        echo "To push your changes, use:"
        echo "  git push origin $CURRENT_BRANCH"
    else
        echo -e "${RED}Merge conflicts detected!${NC}"
        echo "Resolve conflicts, then run:"
        echo "  git commit"
        exit 1
    fi
else
    echo -e "${RED}Invalid choice. Aborting.${NC}"
    exit 1
fi
