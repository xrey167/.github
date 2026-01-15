#!/bin/bash

# Git Cleanup Helper - Remove merged branches
# Usage: ./git-cleanup.sh

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/git-utils.sh"

# Get main branch name
MAIN_BRANCH=$(get_main_branch)

echo -e "${BLUE}Git Cleanup Utility${NC}"
echo "===================="
echo ""

# Update repository
echo -e "${YELLOW}Fetching latest changes...${NC}"
git fetch --prune origin

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Switch to main if needed
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
    echo -e "${YELLOW}Switching to $MAIN_BRANCH...${NC}"
    git checkout "$MAIN_BRANCH"
    git pull origin "$MAIN_BRANCH"
fi

# Find merged branches
echo ""
echo -e "${YELLOW}Finding merged branches...${NC}"
MERGED_BRANCHES=$(git branch --merged "$MAIN_BRANCH" | grep -v "^\*" | grep -v "$MAIN_BRANCH" | grep -v "develop" || true)

if [ -z "$MERGED_BRANCHES" ]; then
    echo -e "${GREEN}No merged branches to clean up!${NC}"
    exit 0
fi

echo ""
echo "The following branches are merged and can be deleted:"
echo -e "${YELLOW}$MERGED_BRANCHES${NC}"
echo ""
read -p "Do you want to delete these branches? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$MERGED_BRANCHES" | while read -r branch; do
        if [ -n "$branch" ]; then
            echo -e "${YELLOW}Deleting local branch: $branch${NC}"
            git branch -d "$branch"
            
            # Try to delete remote branch
            if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
                read -p "Delete remote branch '$branch'? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git push origin --delete "$branch"
                    echo -e "${GREEN}✓ Deleted remote branch: $branch${NC}"
                fi
            fi
        fi
    done
    echo ""
    echo -e "${GREEN}✓ Cleanup complete!${NC}"
else
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
fi

# List remaining branches
echo ""
echo -e "${BLUE}Remaining branches:${NC}"
git branch -a
