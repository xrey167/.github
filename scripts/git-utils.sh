#!/bin/bash

# Git Utilities - Shared functions for git scripts
# Source this file in other scripts: source "$(dirname "$0")/git-utils.sh"

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Get the main branch name
# Returns: main, master, or detected default branch
get_main_branch() {
    local main_branch
    
    # Try symbolic ref first (fast)
    main_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
    
    if [ -n "$main_branch" ]; then
        echo "$main_branch"
        return
    fi
    
    # Try remote show (slower, requires network)
    main_branch=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d' ' -f5)
    
    if [ -n "$main_branch" ]; then
        echo "$main_branch"
        return
    fi
    
    # Fallback: verify common default branch names before returning
    if branch_exists_local "main" || branch_exists_remote "main"; then
        echo "main"
        return
    fi

    if branch_exists_local "master" || branch_exists_remote "master"; then
        echo "master"
        return
    fi

    error_exit "Unable to determine main branch. Checked origin/HEAD, remote show, and common defaults (main, master)."
}

# Check if working directory is clean
# Returns: 0 if clean, 1 if dirty
is_working_directory_clean() {
    git diff-index --quiet HEAD --
}

# Get current branch name
get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

# Check if branch exists locally
# Args: branch_name
# Returns: 0 if exists, 1 if not
branch_exists_local() {
    git rev-parse --verify "$1" >/dev/null 2>&1
}

# Check if branch exists on remote
# Args: branch_name
# Returns: 0 if exists, 1 if not
branch_exists_remote() {
    git ls-remote --heads origin "$1" | grep -q "$1"
}

# Display error message and exit
# Args: error_message
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# Display success message
# Args: success_message
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Display warning message
# Args: warning_message
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Display info message
# Args: info_message
info() {
    echo -e "${CYAN}$1${NC}"
}
