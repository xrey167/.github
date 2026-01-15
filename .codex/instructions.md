# OpenAI Codex Instructions for .github Repository

## Repository Overview
This is an organization-wide `.github` repository that provides default community health files, issue templates, and configuration for all repositories within the organization. Changes here affect the entire organization.

## Git Workflow & Branch Management

### Branch Naming Conventions

Use structured, prefix-based naming:

```
<prefix>/<short-description>
```

**Standard Prefixes:**
- `feature/` - New features or capabilities
- `copilot/` - AI-assisted development tasks
- `fix/` - Bug fixes and corrections
- `hotfix/` - Critical urgent fixes
- `docs/` - Documentation updates
- `refactor/` - Code improvements without behavior changes
- `test/` - Test additions or modifications
- `chore/` - Maintenance and housekeeping

**Naming Guidelines:**
- Use lowercase
- Separate words with hyphens (kebab-case)
- Be descriptive but concise
- Avoid special characters (except `-` and `/`)
- Keep under 50 characters

**Examples:**
```
feature/add-contributing-guide
copilot/setup-ai-instructions
fix/yaml-validation-error
docs/update-readme
hotfix/critical-template-bug
chore/cleanup-old-files
```

### Standard Git Workflow

#### 1. Initialize Work
```bash
# Start from main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/descriptive-name

# Verify branch
git branch --show-current
```

#### 2. Development Cycle
```bash
# Check status frequently
git status

# View changes
git diff

# Stage files
git add <file1> <file2>
# or stage all
git add .

# Commit changes
git commit -m "type: descriptive message"

# Push to remote
git push origin feature/descriptive-name
```

#### 3. Keep Branch Updated
```bash
# Fetch latest from remote
git fetch origin

# View branches
git branch -a

# Merge main into feature
git merge origin/main

# Resolve any conflicts
# Edit conflicting files
git add <resolved-files>
git commit -m "chore: merge main branch"
```

#### 4. Finalize Work
```bash
# Final review
git log --oneline -5
git diff main

# Push final changes
git push

# Create PR on GitHub
# After approval and merge
git checkout main
git pull origin main
git branch -d feature/descriptive-name
```

## Feature Development Flow

### Step 1: Analysis
**Objective:** Understand requirements completely

**Actions:**
- Read issue/task thoroughly
- Identify all affected files
- Understand existing patterns
- Plan minimal changes

**Commands:**
```bash
# Explore repository
ls -la
find . -type f -name "*.yml"
find . -type f -name "*.md"

# Search for relevant content
grep -r "keyword" .
grep -l "pattern" *.yml
```

### Step 2: Planning
**Objective:** Design surgical, minimal changes

**Considerations:**
- What files need modification?
- What new files are needed?
- How to maintain consistency?
- What tests are needed?

**Documentation:**
- Note affected files
- Outline change approach
- Identify dependencies
- Consider edge cases

### Step 3: Implementation
**Objective:** Make focused, incremental changes

**Best Practices:**
- Make one logical change at a time
- Test each change before proceeding
- Follow existing code patterns
- Keep modifications minimal
- Document complex changes

**Workflow:**
```bash
# Make change
# Validate change
git add <changed-file>
git commit -m "type: what changed"

# Repeat for each logical change
```

### Step 4: Validation
**Objective:** Ensure correctness and quality

**Checks:**
```bash
# Syntax validation
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# Review changes
git diff

# Check for secrets
grep -rE "(api_key|password|token|secret)" .

# Verify file structure
ls -la <directory>
```

### Step 5: Integration
**Objective:** Complete and merge work

**Steps:**
- Create descriptive commit messages
- Push changes to remote
- Create pull request
- Address review feedback
- Merge when approved

## Commit Message Format

### Conventional Commits

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace |
| `refactor` | Code restructuring |
| `test` | Add or update tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `build` | Build system changes |

**Subject Guidelines:**
- Use imperative mood ("add", not "added")
- Use lowercase for first letter of description
- No period at the end
- Maximum 72 characters

**Examples:**
```
feat: add security policy template
fix: correct YAML syntax in bug report
docs: update README with workflow instructions
style: format issue templates consistently
refactor: reorganize template directory structure
chore: add .editorconfig file
test: add YAML validation tests
```

**Body (optional):**
- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

**Footer (optional):**
- Reference issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`

## Function Calling Best Practices

### Tool Selection

**File Operations:**
- `view` - Read file contents or directory listing
- `create` - Create new file with content
- `edit` - Modify existing file (old_str → new_str)
- `grep` - Search content across files
- `glob` - Find files by name pattern

**Git Operations:**
- `bash` with git commands
- Always use `--no-pager` flag
- Chain commands with `&&` for efficiency

**Code Analysis:**
- `grep` - Search for patterns in code
- `glob` - Find files by extension or pattern
- `view` - Examine code structure
- `bash` - Execute validation commands

### Execution Strategies

**Parallel Execution (Independent Operations):**
```
# Reading multiple files
view file1.md
view file2.yml
view file3.txt

# Multiple searches
grep pattern: "TODO"
grep pattern: "FIXME"
glob pattern: "*.yml"

# Independent git operations
bash: git status
bash: git log --oneline -5
```

**Sequential Execution (Dependent Operations):**
```
# Step 1
bash: git status
# Step 2 (depends on status)
bash: git diff
# Step 3 (depends on diff review)
bash: git add .
# Step 4 (depends on staging)
bash: git commit -m "message"
```

### Optimization Tips
- Execute independent operations in parallel
- Wait for dependencies before proceeding
- Combine commands with `&&` when possible
- Use `--no-pager` for git commands
- Check command outputs for errors

## Repository-Specific Guidelines

### Issue Templates (ISSUE_TEMPLATE/)

**File Format:**
- Extension: `.yml` (not `.yaml`)
- Syntax: GitHub issue forms YAML
- Location: `ISSUE_TEMPLATE/` directory

**Required Structure:**
```yaml
name: "Template Name"
description: "Brief description of when to use"
title: "[PREFIX]: "
labels: ["label1", "label2"]
assignees: []
body:
  - type: markdown
    attributes:
      value: "## Welcome Message"
  
  - type: input
    id: field_id
    attributes:
      label: "Field Label"
      description: "Help text for user"
      placeholder: "Example input"
    validations:
      required: true
  
  - type: textarea
    id: description
    attributes:
      label: "Description"
      description: "Detailed description"
      placeholder: "Provide details..."
    validations:
      required: true
  
  - type: dropdown
    id: priority
    attributes:
      label: "Priority"
      options:
        - Low
        - Medium
        - High
    validations:
      required: true
```

**Field Types:**
- `markdown` - Static text/instructions
- `input` - Single-line text
- `textarea` - Multi-line text
- `dropdown` - Select one option
- `checkboxes` - Select multiple options

**Validation:**
```yaml
validations:
  required: true  # Field must be filled
```

### AI Assistant Instructions

**Directory Layout:**
```
.github/copilot-instructions.md    # GitHub Copilot
.claude/instructions.md             # Claude AI
.gemini/instructions.md             # Gemini AI
.codex/instructions.md              # OpenAI Codex
```

**Content Structure:**
1. Repository overview
2. Git workflow and branching
3. Feature development flow
4. Commit conventions
5. Function calling guidelines
6. Repository standards
7. Security practices
8. Testing procedures
9. Quick reference
10. Troubleshooting

### Documentation Standards

**README.md:**
- Concise project description
- Directory structure explanation
- Usage instructions
- Links to resources

**Markdown Best Practices:**
- Use headings hierarchically (H1 → H6)
- Code blocks with language tags
- Tables for structured data
- Lists for sequences
- Links to external resources

## Security Best Practices

### Never Commit:
- API keys or tokens
- Passwords or credentials
- Private keys (.key, .pem)
- Environment files (.env)
- Personal information
- Sensitive configuration

### Security Checks:
```bash
# Scan for secrets
grep -rE "(api[_-]?key|password|secret|token)" --ignore-case .

# Check for hardcoded credentials
grep -rE "(username|password)\s*=\s*['\"][^'\"]+['\"]" .

# Review all changes
git diff --no-pager

# Validate no sensitive patterns
grep -rE "['\"][A-Za-z0-9]{32,}['\"]" .
```

### .gitignore Essentials:
```
# Secrets
.env
.env.*
*.key
*.pem
secrets.*

# Build artifacts
node_modules/
dist/
build/
*.log

# OS files
.DS_Store
Thumbs.db
*.swp
```

## Testing & Validation

### Pre-Commit Checklist:
```bash
# 1. Check repository status
git status

# 2. Review all changes
git diff

# 3. Validate YAML syntax
find . -name "*.yml" -exec python -c "import yaml; yaml.safe_load(open('{}'))" \;

# 4. Check for secrets
grep -rE "(password|api_key|token)" --ignore-case .

# 5. Verify branch name
git branch --show-current | grep -E "^(feature|fix|docs|chore|refactor|test|hotfix|copilot)/"
```

### Validation Commands:
```bash
# YAML validation
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# JSON validation
python -c "import json; json.load(open('file.json'))"

# Markdown check
cat file.md

# File permissions
ls -l file.txt
```

### Post-Commit Validation:
```bash
# Verify commit message
git log -1 --pretty=%B

# Check committed files
git diff --name-only HEAD~1

# View commit details
git show HEAD
```

### Template Testing:
1. Navigate to GitHub repository
2. Click "New Issue"
3. Select template
4. Verify all fields display correctly
5. Test required field validation
6. Check dropdown options
7. Validate labels are applied

## Command Reference

### Essential Git Commands:
```bash
# Status & Info
git status                          # Working tree status
git log --oneline -10 --no-pager   # Recent commits
git branch -a                       # All branches
git diff --no-pager                 # Unstaged changes
git diff --staged --no-pager        # Staged changes
git remote -v                       # Remote repositories

# Branching
git checkout -b feature/new         # Create branch
git checkout main                   # Switch branch
git branch -d feature/old           # Delete local branch
git push origin --delete old-branch # Delete remote branch

# Staging & Committing
git add .                           # Stage all
git add file.txt                    # Stage specific file
git reset HEAD file.txt             # Unstage file
git commit -m "type: message"       # Commit
git commit --amend                  # Amend last commit

# Syncing
git fetch origin                    # Fetch changes
git pull origin main               # Pull and merge
git push origin branch              # Push branch
git push -u origin branch          # Push with upstream

# History & Info
git log --graph --oneline --all    # Visual history
git show commit-hash               # Show commit
git blame file.txt                 # File history
git diff branch1..branch2          # Compare branches
```

### File Operations:
```bash
# Finding files
find . -name "*.yml"               # Find by name
find . -type f -name "*.md"        # Find files
find . -type d -name "templates"   # Find directories

# Searching content
grep -r "pattern" .                # Recursive search
grep -l "pattern" *.yml            # List files
grep -n "pattern" file.txt         # With line numbers
grep -i "pattern" file.txt         # Case insensitive

# Directory operations
ls -la                             # List with details
tree -L 2                          # Tree view
pwd                                # Current directory
du -sh *                           # Directory sizes
```

### Validation Commands:
```bash
# YAML
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# JSON
python -c "import json; json.load(open('file.json'))"

# File existence
test -f file.txt && echo "exists" || echo "not found"

# Directory existence
test -d directory && echo "exists" || echo "not found"
```

## Collaboration Workflow

### Pull Request Process:
1. **Create Branch** - Use proper naming convention
2. **Make Changes** - Incremental, tested changes
3. **Commit** - Clear, conventional messages
4. **Push** - Push branch to remote
5. **Open PR** - Descriptive title and description
6. **Request Review** - Tag appropriate reviewers
7. **Address Feedback** - Make requested changes
8. **Merge** - After approval
9. **Clean Up** - Delete branch after merge

### PR Template:
```markdown
## Summary
Brief description of changes

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- How changes were tested
- Validation performed

## Related Issues
- Fixes #123
- Relates to #456

## Checklist
- [ ] Follows coding standards
- [ ] No sensitive data
- [ ] Documentation updated
- [ ] Tests pass
- [ ] Reviewed changes
```

### Code Review Focus:
- **Functionality** - Does it work correctly?
- **Completeness** - All requirements met?
- **Consistency** - Follows patterns?
- **Security** - No vulnerabilities?
- **Documentation** - Properly documented?
- **Tests** - Adequately tested?

## Troubleshooting

### Common Issues & Solutions:

**YAML Syntax Error:**
```bash
# Problem: Invalid YAML
# Solution: Validate and fix
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# Common issues:
# - Wrong indentation (use 2 spaces)
# - Missing colons
# - Unquoted special characters
# - Invalid list syntax
```

**Merge Conflicts:**
```bash
# Problem: Branch conflicts with main
# Solution: Merge and resolve
git fetch origin
git merge origin/main
# Edit conflicting files
git add <resolved-files>
git commit -m "chore: resolve merge conflicts"
```

**Wrong Branch Name:**
```bash
# Problem: Incorrect branch name
# Solution: Rename branch
git branch -m old-name feature/new-name
git push origin --delete old-name
git push -u origin feature/new-name
```

**Accidental Commit:**
```bash
# Problem: Committed wrong files
# Solution: Amend or revert
git reset --soft HEAD~1  # Undo commit, keep changes
git reset --hard HEAD~1  # Undo commit, discard changes
# Or amend last commit
git add correct-file
git commit --amend
```

**Lost Changes:**
```bash
# Problem: Lost uncommitted work
# Solution: Use git stash
git stash list           # View stashed changes
git stash pop            # Restore latest stash
git stash apply stash@{0} # Apply specific stash
```

## Best Practices Summary

### Do's:
✓ Plan changes before implementing
✓ Use descriptive branch names
✓ Make atomic, focused commits
✓ Write clear commit messages
✓ Test thoroughly before pushing
✓ Review diffs before committing
✓ Update documentation
✓ Follow existing patterns
✓ Keep changes minimal
✓ Request reviews when needed

### Don'ts:
✗ Don't commit secrets or credentials
✗ Don't make unrelated changes
✗ Don't use vague commit messages
✗ Don't skip testing
✗ Don't ignore review feedback
✗ Don't commit broken code
✗ Don't delete working functionality
✗ Don't push directly to main
✗ Don't include build artifacts
✗ Don't commit commented-out code

## Resources

**GitHub Documentation:**
- [Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [Issue Forms Syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- [GitHub Actions](https://docs.github.com/en/actions)

**Standards:**
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

**Git Resources:**
- [Pro Git Book](https://git-scm.com/book/en/v2)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Git Best Practices](https://git-scm.com/docs/giteveryday)

**Code Quality:**
- [YAML Specification](https://yaml.org/spec/1.2.2/)
- [Markdown Guide](https://www.markdownguide.org/)
- [EditorConfig](https://editorconfig.org/)
