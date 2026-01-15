# Gemini AI Instructions for .github Repository

## Repository Purpose
This `.github` repository serves as the organization-wide configuration hub, providing default community health files, issue templates, and AI assistant instructions that apply to all repositories within the organization.

## Git Workflow and Branching Strategy

### Branch Naming Conventions
Follow a structured, prefix-based naming system for all branches:

#### Branch Prefixes
| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features or capabilities | `feature/add-code-of-conduct` |
| `copilot/` | AI-assisted development | `copilot/create-templates` |
| `fix/` | Bug fixes | `fix/template-validation-error` |
| `hotfix/` | Critical production fixes | `hotfix/security-template-issue` |
| `docs/` | Documentation changes | `docs/enhance-readme` |
| `refactor/` | Code improvements | `refactor/reorganize-templates` |
| `test/` | Test additions | `test/validate-yaml-syntax` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

#### Naming Best Practices
- Use lowercase letters
- Separate words with hyphens (kebab-case)
- Keep names descriptive but concise
- Avoid special characters except hyphens and slashes
- Maximum 50 characters recommended

### Git Workflow Steps

#### 1. Start New Work
```bash
# Sync with main branch
git checkout main
git pull origin main

# Create new branch
git checkout -b feature/descriptive-name

# Confirm branch
git branch --show-current
```

#### 2. Make Changes Iteratively
```bash
# View current status
git status

# See what changed
git diff

# Stage changes
git add <specific-files>
# or
git add .

# Commit with clear message
git commit -m "feat: descriptive commit message"
```

#### 3. Push to Remote
```bash
# First push (set upstream)
git push -u origin feature/descriptive-name

# Subsequent pushes
git push
```

#### 4. Keep Branch Updated
```bash
# Fetch latest changes
git fetch origin

# Merge main into feature branch
git merge origin/main

# Resolve conflicts if needed
git status
# Edit conflicting files
git add <resolved-files>
git commit -m "chore: merge main branch"
```

#### 5. Complete Work
```bash
# Final review
git log --oneline -5 --no-pager
git diff main --no-pager

# Push final changes
git push

# Create PR on GitHub
# After merge, clean up
git checkout main
git pull origin main
git branch -d feature/descriptive-name
```

## Feature Development Flow

### Development Methodology

#### Phase 1: Analysis & Planning
**Objectives:**
- Understand the complete requirement
- Identify all affected components
- Plan minimal, surgical changes
- Consider edge cases and impacts

**Actions:**
```bash
# Explore repository structure
ls -la
tree -L 2

# Find relevant files
find . -name "*.yml" -o -name "*.md"

# Search for related content
grep -r "keyword" .
```

#### Phase 2: Implementation
**Objectives:**
- Make focused, incremental changes
- Maintain consistency with existing code
- Follow established patterns
- Document changes inline when needed

**Actions:**
- Create or modify files using appropriate tools
- Test each change before proceeding
- Validate syntax and structure
- Keep changes minimal and focused

#### Phase 3: Validation
**Objectives:**
- Ensure correctness of changes
- Validate syntax and formatting
- Test functionality where applicable
- Verify no sensitive data included

**Actions:**
```bash
# Validate YAML files
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# Check Markdown formatting
markdownlint file.md 2>/dev/null || cat file.md

# Review changes
git diff --no-pager

# Check for secrets
grep -E "(api_key|password|token|secret)" -i .
```

#### Phase 4: Commit & Push
**Objectives:**
- Create clear, atomic commits
- Follow commit message conventions
- Push changes to remote
- Prepare for review

**Actions:**
```bash
# Stage reviewed changes
git add .

# Commit with conventional message
git commit -m "feat: add comprehensive AI instructions"

# Push to remote
git push origin feature/branch-name
```

## Commit Message Standards

### Conventional Commits Format

**Structure:**
```
<type>(<optional-scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add security policy template` |
| `fix` | Bug fix | `fix: correct YAML indentation` |
| `docs` | Documentation | `docs: update README usage section` |
| `style` | Formatting | `style: fix markdown formatting` |
| `refactor` | Code restructuring | `refactor: reorganize template directory` |
| `test` | Testing | `test: add template validation` |
| `chore` | Maintenance | `chore: update .gitignore` |
| `perf` | Performance | `perf: optimize template loading` |
| `ci` | CI/CD changes | `ci: add workflow validation` |
| `build` | Build system | `build: update build configuration` |
| `revert` | Revert previous | `revert: undo template changes` |

### Commit Message Examples

**Good Examples:**
```
feat: add data issue template for data quality reports
fix: correct required field validation in bug report
docs: add git workflow section to instructions
chore: add .editorconfig for consistent formatting
refactor: simplify issue template structure
```

**Poor Examples (Avoid):**
```
update files
fixed stuff
changes
WIP
asdfasdf
```

### Commit Best Practices
- Keep first line under 72 characters
- Use imperative mood ("add" not "added")
- Don't end with period
- Provide context in body for complex changes
- Reference issues when relevant (#123)

## Function Calling Guidelines

### Tool Selection Matrix

#### File Operations
| Task | Tool | Example |
|------|------|---------|
| Read file contents | `view` | `view path/to/file.md` |
| Create new file | `create` | `create path/to/newfile.yml` |
| Modify existing file | `edit` | `edit old_str/new_str` |
| Find files by name | `glob` | `glob pattern: "**/*.yml"` |
| Search file contents | `grep` | `grep pattern: "label"` |

#### Git Operations
| Task | Command | Example |
|------|---------|---------|
| Check status | `git status` | `git status` |
| View changes | `git diff` | `git diff --no-pager` |
| View history | `git log` | `git log --oneline -10 --no-pager` |
| List branches | `git branch` | `git branch -a` |
| Create branch | `git checkout -b` | `git checkout -b feature/new` |

#### Code Analysis
| Task | Tool | Example |
|------|------|---------|
| Search patterns | `grep` | `grep pattern: "TODO" output_mode: "content"` |
| Find files | `glob` | `glob pattern: "*.md"` |
| View directory | `view` | `view path/to/directory` |
| Execute commands | `bash` | `bash command: "ls -la"` |

### Parallel vs Sequential Execution

#### Parallel Execution (Independent Operations)
Use when operations don't depend on each other:
```
Example 1: Reading multiple files
- view file1.md
- view file2.yml
- view file3.txt

Example 2: Multiple searches
- grep pattern: "feature"
- grep pattern: "bugfix"
- glob pattern: "*.yml"

Example 3: Mixed operations
- view README.md
- grep pattern: "template"
- bash command: "ls -la"
```

#### Sequential Execution (Dependent Operations)
Use when later operations need results from earlier ones:
```
Example 1: Git workflow
1. bash: git status
2. bash: git diff (analyze status first)
3. bash: git add . (after reviewing)
4. bash: git commit -m "message"

Example 2: Conditional operations
1. view file.yml
2. edit file.yml (based on content seen)
3. bash: validate file.yml

Example 3: Build and test
1. bash: npm install
2. bash: npm run build (needs install first)
3. bash: npm test (needs build first)
```

### Function Calling Best Practices
1. **Maximize parallelism** - Execute independent operations together
2. **Respect dependencies** - Wait for required information
3. **Check outputs** - Verify command results before proceeding
4. **Handle errors** - Check exit codes and error messages
5. **Minimize calls** - Combine commands when possible using `&&`

## Repository-Specific Standards

### Issue Templates (ISSUE_TEMPLATE/)

#### Structure Requirements
- **Format**: YAML with GitHub issue form syntax
- **Location**: `ISSUE_TEMPLATE/` directory
- **Extension**: `.yml` (not `.yaml`)
- **Naming**: Descriptive, lowercase with underscores

#### Required Fields
```yaml
name: "Template Display Name"
description: "When to use this template"
title: "[PREFIX]: "
labels: ["label1", "label2"]
body:
  - type: markdown
    attributes:
      value: "Welcome text"
  - type: input
    id: field_id
    attributes:
      label: "Field Label"
      description: "Help text"
      placeholder: "Example"
    validations:
      required: true
```

#### Field Types Available
- `input` - Single line text input
- `textarea` - Multi-line text input
- `dropdown` - Selection from options
- `checkboxes` - Multiple selections
- `markdown` - Static text/instructions

#### Validation Rules
```yaml
validations:
  required: true  # Field must be filled
```

### AI Assistant Instructions

#### Directory Structure
```
.github/              # GitHub Copilot
  copilot-instructions.md
.claude/             # Claude AI
  instructions.md
.gemini/             # Gemini AI
  instructions.md
.codex/              # OpenAI Codex
  instructions.md
```

#### Content Requirements
Each instruction file should include:
1. Repository overview and purpose
2. Git workflow and branch naming
3. Feature development flow
4. Commit message conventions
5. Function calling guidelines
6. Repository-specific best practices
7. Testing and validation procedures
8. Quick reference commands

### Documentation Standards

#### README.md
- Keep concise and focused
- Include repository purpose
- Explain directory structure
- Provide usage examples
- Link to additional resources

#### Markdown Formatting
- Use proper heading hierarchy
- Include code blocks with syntax highlighting
- Use tables for structured data
- Add lists for steps and items
- Include links to external resources

## Security and Compliance

### Security Checklist
- [ ] No API keys or tokens
- [ ] No passwords or credentials
- [ ] No personal identifiable information (PII)
- [ ] No sensitive configuration values
- [ ] No hardcoded secrets

### Review Process
```bash
# Check for common secret patterns
grep -rE "(api[_-]?key|password|secret|token|credential)" --ignore-case .

# Scan specific patterns
grep -rE "['\"][a-zA-Z0-9]{32,}['\"]" .

# Review all changes
git diff --no-pager
```

### .gitignore Best Practices
```
# Ignore sensitive files
.env
.env.local
*.key
*.pem
secrets.yml

# Ignore build artifacts
node_modules/
dist/
build/
*.log

# Ignore OS files
.DS_Store
Thumbs.db
```

## Testing and Validation

### Pre-Commit Checks
```bash
# 1. Review all changes
git status
git diff

# 2. Validate YAML syntax
find . -name "*.yml" -type f | while read file; do
  python -c "import yaml; yaml.safe_load(open('$file'))" && echo "✓ $file" || echo "✗ $file"
done

# 3. Check Markdown files
find . -name "*.md" -type f -exec echo "Checking {}" \;

# 4. Ensure no secrets
grep -rE "(password|api_key|token)" --ignore-case . && echo "⚠ Possible secrets found" || echo "✓ No secrets detected"

# 5. Verify branch name
git branch --show-current | grep -E "^(feature|fix|docs|chore|refactor|test|hotfix|copilot)/" && echo "✓ Valid branch name" || echo "✗ Invalid branch name"
```

### Post-Commit Validation
```bash
# 1. Verify commit message format
git log -1 --pretty=%B | grep -E "^(feat|fix|docs|style|refactor|test|chore)" && echo "✓ Valid commit message" || echo "✗ Invalid commit message"

# 2. Check file additions
git diff --name-only HEAD~1

# 3. Verify no large files
git diff --stat HEAD~1
```

### Template Testing
- Create test issues using templates in GitHub UI
- Verify all fields render correctly
- Check required field validation
- Test dropdown options
- Validate labels are applied

## Quick Reference Guide

### Essential Git Commands
```bash
# Repository state
git status                          # Working tree status
git diff --no-pager                 # Unstaged changes
git diff --staged --no-pager        # Staged changes
git log --oneline -10 --no-pager   # Recent commits

# Branching
git branch                          # List local branches
git branch -a                       # List all branches
git checkout -b feature/new         # Create and switch branch
git checkout main                   # Switch to main
git branch -d feature/old           # Delete local branch

# Making changes
git add .                           # Stage all changes
git add path/to/file               # Stage specific file
git commit -m "type: message"      # Commit with message
git commit --amend                  # Amend last commit

# Syncing
git fetch origin                    # Fetch remote changes
git pull origin main               # Pull and merge main
git push origin branch-name        # Push branch
git push -u origin branch-name     # Push and set upstream

# Information
git log --oneline --graph --all    # Visual commit history
git show commit-hash               # Show commit details
git blame file.txt                 # Show file history
```

### File and Search Commands
```bash
# Finding files
find . -name "*.yml"               # Find YAML files
find . -type f -name "*.md"        # Find Markdown files
ls -laR                            # List all files recursively

# Searching content
grep -r "pattern" .                # Recursive search
grep -l "pattern" *.yml            # List matching files
grep -n "pattern" file.txt         # Show line numbers

# Directory navigation
pwd                                # Current directory
tree -L 2                          # Directory tree (2 levels)
du -sh *                           # Directory sizes
```

## Collaboration Guidelines

### Pull Request Workflow
1. **Create PR** with descriptive title (conventional commits format)
2. **Write description** explaining what, why, and how
3. **Link issues** using keywords (fixes #123, closes #456)
4. **Request review** from appropriate team members
5. **Address feedback** promptly and professionally
6. **Update PR** with requested changes
7. **Merge** after approval (squash or merge based on preference)
8. **Delete branch** after successful merge

### Code Review Focus
- **Correctness**: Does it work as intended?
- **Completeness**: Are all requirements addressed?
- **Consistency**: Follows repository patterns?
- **Security**: No sensitive data or vulnerabilities?
- **Documentation**: Changes are documented?
- **Testing**: Has it been validated?

### PR Description Template
```markdown
## Description
Brief description of changes

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
How changes were validated

## Related Issues
Fixes #123
Relates to #456

## Checklist
- [ ] Code follows repository standards
- [ ] No sensitive data included
- [ ] Documentation updated
- [ ] Changes validated
```

## Troubleshooting Common Issues

### YAML Syntax Errors
**Problem**: Invalid YAML structure
**Solution**:
```bash
# Validate YAML
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# Common issues:
# - Incorrect indentation (use 2 spaces)
# - Missing colons after keys
# - Invalid characters in strings
# - Unclosed quotes
```

### Merge Conflicts
**Problem**: Branch conflicts with main
**Solution**:
```bash
git checkout main
git pull origin main
git checkout feature/branch
git merge main
# Resolve conflicts in editor
git add <resolved-files>
git commit -m "chore: resolve merge conflicts"
git push
```

### Branch Naming Issues
**Problem**: Incorrect branch name format
**Solution**:
```bash
# Rename local branch
git branch -m old-name feature/new-name

# Delete remote old branch and push new
git push origin :old-name
git push -u origin feature/new-name
```

## Best Practices Checklist

- [ ] **Plan before implementing** - Understand full scope
- [ ] **Use descriptive branch names** - Follow prefix conventions
- [ ] **Make atomic commits** - One logical change per commit
- [ ] **Write clear messages** - Follow conventional commits
- [ ] **Test thoroughly** - Validate all changes
- [ ] **Review diffs** - Check before committing
- [ ] **Update documentation** - Keep docs current
- [ ] **Maintain consistency** - Follow existing patterns
- [ ] **Protect sensitive data** - Never commit secrets
- [ ] **Collaborate effectively** - Clear communication in PRs

## Additional Resources

- [GitHub Docs - Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [GitHub Docs - Issue Forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Pro Git Book](https://git-scm.com/book/en/v2)
- [YAML Specification](https://yaml.org/spec/1.2.2/)
- [Markdown Guide](https://www.markdownguide.org/)
