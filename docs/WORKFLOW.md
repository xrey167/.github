# Development Workflow Guide

This guide outlines the development process and workflows for projects in this organization.

## Table of Contents

- [Getting Started](#getting-started)
- [Branch Strategy](#branch-strategy)
- [Development Workflow](#development-workflow)
- [Code Review Process](#code-review-process)
- [CI/CD Pipeline](#cicd-pipeline)
- [Release Process](#release-process)

## Getting Started

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-name>
   ```

2. **Run setup script**
   ```bash
   ./scripts/setup.sh
   ```
   This will:
   - Make scripts executable
   - Install git hooks
   - Install project dependencies
   - Create `.env` from `.env.example`

3. **Verify setup**
   ```bash
   ./scripts/git-status.sh
   ```

### Required Tools

- Git 2.20+
- Node.js 16+ (for JavaScript/TypeScript projects)
- Python 3.8+ (for Python projects)
- Go 1.19+ (for Go projects)
- Your preferred IDE/editor

## Branch Strategy

We use a simplified Git Flow strategy:

### Main Branches

- **`main`** - Production-ready code
- **`develop`** (optional) - Integration branch for features

### Supporting Branches

- **`feature/*`** - New features and enhancements
- **`bugfix/*`** - Bug fixes
- **`hotfix/*`** - Critical production fixes
- **`release/*`** - Release preparation

### Branch Naming Convention

```
<type>/<issue-number>-<short-description>

Examples:
- feature/123-user-authentication
- bugfix/456-login-error
- hotfix/789-critical-security-fix
```

## Development Workflow

### 1. Start New Work

**Create an issue first:**
- Use appropriate issue template
- Define acceptance criteria
- Get approval/assignment

**Create a branch:**
```bash
./scripts/git-branch.sh feature "123-user-authentication"
```

### 2. Development Cycle

**Make changes:**
```bash
# Make your code changes
# Add tests
# Update documentation

# Check status
./scripts/git-status.sh
```

**Commit changes:**
```bash
git add <files>
git commit -m "feat: add user authentication (#123)"
```

**Commit Message Format:**
```
<type>: <subject> (#issue)

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat: add user authentication (#123)

- Implement JWT-based authentication
- Add login/logout endpoints
- Create user session management

Closes #123
```

### 3. Keep Branch Updated

**Sync with main branch regularly:**
```bash
./scripts/git-sync.sh
```

This helps avoid large merge conflicts later.

### 4. Push Changes

**First push:**
```bash
git push -u origin feature/123-user-authentication
```

**Subsequent pushes:**
```bash
git push
```

### 5. Create Pull Request

**When ready for review:**

1. Ensure all tests pass
2. Update documentation
3. Create pull request on GitHub
4. Fill out PR template
5. Request reviewers
6. Link related issues

**PR Title Format:**
```
[TYPE] Short description (#issue)

Examples:
- [FEATURE] Add user authentication (#123)
- [BUGFIX] Fix login error (#456)
- [HOTFIX] Patch security vulnerability (#789)
```

## Code Review Process

### For Authors

**Before requesting review:**
- [ ] All tests pass
- [ ] Code is self-documented
- [ ] No console.log/debug statements
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Follows project conventions

**During review:**
- Respond to all comments
- Make requested changes
- Re-request review after changes
- Be open to feedback

### For Reviewers

**Review checklist:**
- [ ] Code solves the stated problem
- [ ] Tests are adequate
- [ ] No security issues
- [ ] Performance considerations
- [ ] Error handling present
- [ ] Code is readable and maintainable
- [ ] Documentation is clear

**Review guidelines:**
- Be constructive and respectful
- Explain the "why" behind suggestions
- Distinguish between blocking issues and suggestions
- Approve when ready or request changes

## CI/CD Pipeline

### Continuous Integration

**On every push:**
1. Linting and code style checks
2. Unit tests
3. Integration tests
4. Build verification
5. Security scanning

**On pull request:**
1. All CI checks from push
2. Code coverage analysis
3. Dependency vulnerability scan
4. Preview deployment (if applicable)

### Continuous Deployment

**On merge to main:**
1. All CI checks pass
2. Build production artifacts
3. Deploy to staging
4. Run smoke tests
5. Deploy to production (if auto-deploy enabled)

## Release Process

### Preparing a Release

1. **Create release branch:**
   ```bash
   ./scripts/git-branch.sh release "v1.2.0"
   ```

2. **Update version numbers:**
   - `package.json` / `pyproject.toml` / etc.
   - `CHANGELOG.md`
   - Documentation

3. **Final testing:**
   - Run full test suite
   - Manual QA testing
   - Performance testing

4. **Create release PR:**
   - Merge release branch to `main`
   - Tag the release
   - Generate release notes

### Hotfix Process

**For critical production issues:**

1. **Create hotfix branch from main:**
   ```bash
   ./scripts/git-branch.sh hotfix "critical-bug-fix"
   ```

2. **Fix the issue:**
   - Minimal changes
   - Add regression test
   - Update version (patch bump)

3. **Deploy:**
   - Create PR to main
   - Fast-track review
   - Deploy immediately after merge

4. **Backport:**
   - Cherry-pick to develop branch
   - Ensure fix is in next release

## Git Helper Scripts

All scripts are in the `scripts/` directory:

### `setup.sh`
Initial project setup - dependencies, hooks, configuration.

### `git-branch.sh`
Create feature/bugfix/hotfix branches with proper naming.
```bash
./scripts/git-branch.sh <type> <name>
```

### `git-sync.sh`
Sync current branch with main (rebase or merge).
```bash
./scripts/git-sync.sh
```

### `git-cleanup.sh`
Clean up merged branches (local and remote).
```bash
./scripts/git-cleanup.sh
```

### `git-status.sh`
Enhanced status with branch info and helpful tips.
```bash
./scripts/git-status.sh
```

## Best Practices

### Commits

- Make atomic commits (one logical change per commit)
- Write clear commit messages
- Commit often, push regularly
- Never commit secrets or sensitive data

### Branches

- Keep branches short-lived (< 1 week)
- One branch per feature/fix
- Delete after merging
- Sync with main regularly

### Pull Requests

- Keep PRs focused and small
- Provide context in description
- Include screenshots for UI changes
- Respond to reviews promptly

### Code Quality

- Write tests for new code
- Maintain test coverage
- Follow project style guide
- Document complex logic
- Refactor as you go

## Troubleshooting

### Merge Conflicts

1. Update your branch: `./scripts/git-sync.sh`
2. Resolve conflicts in your editor
3. Mark as resolved: `git add <file>`
4. Continue: `git rebase --continue` or `git merge --continue`
5. Push: `git push --force-with-lease` (if rebased)

### Accidental Commits

**Undo last commit (keep changes):**
```bash
git reset HEAD~1
```

**Undo last commit (discard changes):**
```bash
git reset --hard HEAD~1
```

**Amend last commit:**
```bash
git add <forgotten-files>
git commit --amend --no-edit
```

### Lost Work

**Find lost commits:**
```bash
git reflog
git checkout <commit-hash>
```

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## Getting Help

- Check this documentation
- Ask in team chat
- Create a discussion on GitHub
- Contact project maintainers
