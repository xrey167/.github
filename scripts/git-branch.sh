#!/bin/bash

# Git Branch Creation Helper
# Usage: ./git-branch.sh <type> <branch-name>
# Types: feature, bugfix, hotfix, release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 <type> <branch-name>"
    echo ""
    echo "Types:"
    echo "  feature  - New feature development"
    echo "  bugfix   - Bug fixes"
    echo "  hotfix   - Critical production fixes"
    echo "  release  - Release preparation"
    echo ""
    echo "Example: $0 feature user-authentication"
    exit 1
}

# Check arguments
if [ $# -ne 2 ]; then
    usage
fi

TYPE=$1
BRANCH_NAME=$2

# Validate type
case $TYPE in
    feature|bugfix|hotfix|release)
        ;;
    *)
        echo -e "${RED}Error: Invalid type '$TYPE'${NC}"
        usage
        ;;
esac

# Construct full branch name
FULL_BRANCH_NAME="${TYPE}/${BRANCH_NAME}"

# Check if branch already exists
if git rev-parse --verify "$FULL_BRANCH_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Branch '$FULL_BRANCH_NAME' already exists!${NC}"
    read -p "Do you want to checkout the existing branch? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout "$FULL_BRANCH_NAME"
        echo -e "${GREEN}Switched to existing branch '$FULL_BRANCH_NAME'${NC}"
    fi
    exit 0
fi

# Update main/master branch
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
echo -e "${YELLOW}Updating $MAIN_BRANCH...${NC}"
git fetch origin
git checkout "$MAIN_BRANCH"
git pull origin "$MAIN_BRANCH"

# Create and checkout new branch
echo -e "${YELLOW}Creating branch '$FULL_BRANCH_NAME'...${NC}"
git checkout -b "$FULL_BRANCH_NAME"

echo -e "${GREEN}✓ Branch '$FULL_BRANCH_NAME' created and checked out!${NC}"
echo ""
echo "Next steps:"
echo "  1. Make your changes"
echo "  2. git add <files>"
echo "  3. git commit -m 'Your message'"
echo "  4. git push -u origin $FULL_BRANCH_NAME"
