# Quick Reference Guide

Fast reference for common tasks and commands.

## Table of Contents

- [Git Commands](#git-commands)
- [Project Setup](#project-setup)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## Git Commands

### Starting New Work

```bash
# Create feature branch
./scripts/git-branch.sh feature "feature-name"

# Create bugfix branch
./scripts/git-branch.sh bugfix "bug-description"

# Create hotfix branch
./scripts/git-branch.sh hotfix "critical-fix"
```

### Daily Work

```bash
# Check status
./scripts/git-status.sh

# Add and commit
git add .
git commit -m "feat: description"

# Push changes
git push

# Pull latest
git pull
```

### Syncing

```bash
# Sync with main
./scripts/git-sync.sh

# Fetch all branches
git fetch --all

# Pull with rebase
git pull --rebase
```

### Cleanup

```bash
# Clean merged branches
./scripts/git-cleanup.sh

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name
```

### Undo Changes

```bash
# Undo last commit (keep changes)
git reset HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Discard local changes
git checkout -- <file>
git restore <file>

# Amend last commit
git commit --amend

# Revert commit
git revert <commit-hash>
```

### Stashing

```bash
# Stash changes
git stash

# Stash with message
git stash save "description"

# List stashes
git stash list

# Apply last stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Drop stash
git stash drop stash@{0}
```

### Viewing History

```bash
# View log
git log --oneline -10

# View with graph
git log --oneline --graph --all

# View file history
git log --follow <file>

# View changes
git diff
git diff HEAD~1
git diff branch-name
```

### Cherry-picking

```bash
# Cherry-pick commit
git cherry-pick <commit-hash>

# Cherry-pick without commit
git cherry-pick -n <commit-hash>
```

### Rebasing

```bash
# Rebase on main
git rebase main

# Interactive rebase (last 3 commits)
git rebase -i HEAD~3

# Continue after conflicts
git rebase --continue

# Abort rebase
git rebase --abort
```

## Project Setup

### New Project

```bash
# Initialize new project
./templates/project-structure/init-project.sh <name> <type>

# Types: backend, frontend, fullstack, library, trading
```

### Existing Project

```bash
# Clone and setup
git clone <url>
cd <project>
./scripts/setup.sh
```

### Environment

```bash
# Copy example env
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor
```

## Development

### Node.js

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build
npm run build

# Run production
npm start

# Lint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Python

```bash
# Create virtual environment
python -m venv venv

# Activate
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run application
python main.py

# Run with auto-reload
python -m flask run --reload
```

### Go

```bash
# Install dependencies
go mod download

# Run
go run main.go

# Build
go build -o app

# Test
go test ./...

# Format
go fmt ./...
```

## Testing

### Unit Tests

```bash
# Node.js
npm test
npm run test:watch
npm run test:coverage

# Python
pytest
pytest --cov
pytest tests/unit/

# Go
go test ./...
go test -v -cover ./...
```

### Integration Tests

```bash
# Node.js
npm run test:integration

# Python
pytest tests/integration/

# Go
go test -tags=integration ./...
```

### E2E Tests

```bash
# Node.js (with Playwright/Cypress)
npm run test:e2e
npm run test:e2e:ui
```

## Deployment

### Build

```bash
# Node.js
npm run build

# Python
python setup.py build

# Go
go build -o app
```

### Docker

```bash
# Build image
docker build -t <name>:<tag> .

# Run container
docker run -p 3000:3000 <name>:<tag>

# Docker Compose
docker-compose up
docker-compose up -d  # detached
docker-compose down
```

### Environment-specific

```bash
# Deploy to staging
./scripts/deploy/deploy-staging.sh

# Deploy to production
./scripts/deploy/deploy-prod.sh
```

## Commit Message Convention

```bash
# Format
<type>: <subject>

# Types
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Formatting, missing semicolons, etc.
refactor: # Code restructuring
test:     # Adding tests
chore:    # Maintenance

# Examples
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login error"
git commit -m "docs: update API documentation"
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline -10'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'

# Project aliases
alias status='./scripts/git-status.sh'
alias sync='./scripts/git-sync.sh'
alias cleanup='./scripts/git-cleanup.sh'
```

## Emergency Commands

### Broke everything?

```bash
# Reset to last commit
git reset --hard HEAD

# Reset to specific commit
git reset --hard <commit-hash>

# Reset to origin
git reset --hard origin/main
```

### Lost commits?

```bash
# Find lost commits
git reflog

# Recover
git checkout <commit-hash>
git cherry-pick <commit-hash>
```

### Conflicts everywhere?

```bash
# Abort merge
git merge --abort

# Abort rebase
git rebase --abort

# Start over
git reset --hard origin/<branch>
```

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com)
- [Full Workflow Guide](WORKFLOW.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## Getting Help

```bash
# Git help
git help <command>
git <command> --help

# Examples
git help commit
git rebase --help
```

---

**Pro Tip:** Print this guide or bookmark it for quick reference!
