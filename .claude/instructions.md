# Claude AI Instructions for .github Repository

## About This Repository
This is an organization-wide `.github` repository containing community health files, issue templates, and AI assistant configurations that apply across all repositories in the organization.

## Git Workflow Standards

### Branch Naming Strategy
Use descriptive, kebab-case branch names with appropriate prefixes:

**Prefixes:**
- `feature/` - New features or enhancements
- `copilot/` - AI-assisted development tasks
- `fix/` - Bug fixes and corrections
- `hotfix/` - Critical production fixes
- `docs/` - Documentation updates
- `refactor/` - Code improvements without behavior changes
- `test/` - Test additions or updates
- `chore/` - Maintenance and routine tasks

**Examples:**
```
feature/add-contributing-guidelines
copilot/setup-copilot-instructions
fix/yaml-syntax-issue-template
docs/improve-readme-clarity
```

### Git Command Patterns

#### Starting New Work
```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/descriptive-name

# Verify branch creation
git branch --show-current
```

#### Making Changes
```bash
# Check what's changed
git status
git diff

# Stage specific files
git add path/to/file

# Or stage all changes
git add .

# Commit with conventional format
git commit -m "feat: add new issue template for data issues"
```

#### Pushing and Syncing
```bash
# Push new branch
git push -u origin feature/descriptive-name

# Push subsequent commits
git push

# Sync with main
git fetch origin
git merge origin/main
```

## Feature Development Flow

### Phase 1: Understanding
1. **Read the issue thoroughly** - Understand requirements, context, and constraints
2. **Explore the codebase** - Use view, grep, and glob tools to understand structure
3. **Identify scope** - Determine what files need changes
4. **Plan minimal changes** - Focus on surgical, targeted modifications

### Phase 2: Implementation
1. **Create feature branch** following naming conventions
2. **Make incremental changes** - Small, testable modifications
3. **Validate each change** - Ensure syntax and functionality
4. **Document as needed** - Update relevant documentation
5. **Follow existing patterns** - Maintain consistency with repository style

### Phase 3: Quality Assurance
1. **Review all changes** - Use `git diff` to review modifications
2. **Validate syntax** - Check YAML, Markdown, and other formats
3. **Test functionality** - Verify templates work as expected
4. **Check for secrets** - Ensure no sensitive data is committed
5. **Verify completeness** - All requirements addressed

### Phase 4: Integration
1. **Commit changes** - Use conventional commit messages
2. **Push to remote** - Make branch available for review
3. **Create pull request** - With clear title and description
4. **Address feedback** - Make requested changes promptly
5. **Merge when approved** - Complete the feature integration

## Commit Message Conventions

Use the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat:` - New feature (e.g., new issue template)
- `fix:` - Bug fix (e.g., correct YAML syntax)
- `docs:` - Documentation only
- `style:` - Formatting, whitespace, etc.
- `refactor:` - Code restructuring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Examples
```
feat: add security policy template
fix: correct YAML indentation in bug report template
docs: update README with usage instructions
chore: add .gitignore for common artifacts
```

## Function Calling Best Practices

### Tool Selection Strategy

#### File Operations
- **view**: Examine file contents, directory structure
- **create**: Create new files with content
- **edit**: Modify existing files with old_str/new_str
- **grep**: Search for content patterns in files
- **glob**: Find files matching name patterns

#### Git Operations
- **bash**: Execute git commands (status, diff, log, branch, etc.)
- Always use `--no-pager` flag for git commands
- Chain independent git commands with `&&`

#### Parallel vs Sequential
```
# GOOD: Parallel independent operations
- view file1.md
- view file2.yml  
- grep pattern: "label" glob: "*.yml"

# GOOD: Sequential dependent operations
1. bash: git status
2. bash: git diff (analyze status first)
3. bash: git add . (after reviewing diff)
```

### Common Patterns

#### Repository Exploration
```bash
# Check current state
git status && git branch --show-current

# View recent history
git log --oneline -10 --no-pager

# See what changed
git diff --no-pager

# Find specific files
find . -name "*.yml" -type f
```

#### Making Changes
```bash
# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# Check Markdown formatting
cat file.md | head -n 20

# Stage and review
git add . && git status
```

## Repository-Specific Guidelines

### Issue Templates (ISSUE_TEMPLATE/)
- Use YAML format for GitHub issue forms
- Include clear name, description, and labels
- Define appropriate input types (input, textarea, dropdown, checkboxes)
- Set required fields appropriately
- Test templates on GitHub after creation

**Template Structure:**
```yaml
name: Template Name
description: Clear description of when to use this template
title: "[PREFIX]: "
labels: ["label1", "label2"]
body:
  - type: input
    id: field_id
    attributes:
      label: Field Label
      description: Help text
      placeholder: Example value
    validations:
      required: true
```

### AI Assistant Instructions
- Keep instructions clear and actionable
- Include git workflow, branch naming, commit conventions
- Provide function calling guidelines
- Include repository-specific best practices
- Update when workflows change

### Documentation
- Maintain clear, concise README.md
- Use proper Markdown formatting
- Include examples where helpful
- Keep information current

## Security and Privacy

### Never Commit
- API keys or tokens
- Passwords or credentials
- Personal information
- Sensitive configuration

### Always Review
- Check `git diff` before committing
- Scan for patterns like `password=`, `api_key=`, `token=`
- Validate all file contents
- Ensure proper .gitignore entries

## Testing and Validation

### Before Committing
```bash
# Review all changes
git diff

# Check file status
git status

# Validate YAML files
find . -name "*.yml" -exec python -c "import yaml, sys; yaml.safe_load(open('{}')); print('✓ {}')" \;

# Check for common issues
grep -r "TODO\|FIXME\|XXX" .
```

### After Pushing
- Verify branch exists on remote
- Check GitHub Actions (if applicable)
- Test issue templates in GitHub UI
- Validate organization-wide visibility

## Quick Command Reference

### Essential Git Commands
```bash
# Status and information
git status                          # Check working tree status
git log --oneline -10 --no-pager   # Recent commits
git branch -a                       # List all branches
git diff --no-pager                 # Show unstaged changes
git diff --staged --no-pager        # Show staged changes

# Branch management
git checkout -b feature/new-feature # Create and switch to branch
git checkout main                   # Switch to main
git branch -d feature/old-feature   # Delete local branch

# Committing changes
git add .                           # Stage all changes
git add path/to/file               # Stage specific file
git commit -m "type: message"      # Commit with message
git push origin branch-name        # Push to remote

# Syncing
git fetch origin                    # Fetch remote changes
git pull origin main               # Pull main branch
git merge origin/main              # Merge main into current
```

### File Operations
```bash
# Find files
find . -name "*.md"                # Find Markdown files
find . -type f -name "*.yml"       # Find YAML files

# Search content
grep -r "pattern" .                # Search in all files
grep -l "pattern" *.yml            # List files with pattern

# Directory operations
ls -la                             # List all files with details
tree -L 2                          # Show directory tree (2 levels)
```

## Collaboration Workflow

### Pull Request Guidelines
- **Title**: Clear, descriptive, follows conventional commits format
- **Description**: Context, what changed, why it changed
- **References**: Link to related issues
- **Scope**: Keep PRs focused and reviewable
- **Testing**: Describe how changes were validated

### Code Review Checklist
- [ ] Correct syntax (YAML, Markdown, etc.)
- [ ] Follows existing patterns and conventions
- [ ] No sensitive data or secrets
- [ ] Documentation is updated
- [ ] Changes are minimal and focused
- [ ] Commit messages follow conventions

## Troubleshooting

### Common Issues

**YAML Syntax Errors**
```bash
# Validate YAML
python -c "import yaml; yaml.safe_load(open('file.yml'))"

# Common issues: indentation, missing colons, invalid characters
```

**Branch Conflicts**
```bash
# Update branch with main
git checkout main
git pull origin main
git checkout feature/branch
git merge main
# Resolve conflicts if any
git add .
git commit -m "chore: merge main into feature branch"
```

**Uncommitted Changes**
```bash
# Stash changes temporarily
git stash

# Do other work
git checkout main

# Restore changes
git checkout feature/branch
git stash pop
```

## Best Practices Summary

1. **Plan before coding** - Understand requirements fully
2. **Branch appropriately** - Use descriptive names with prefixes
3. **Commit incrementally** - Small, logical commits
4. **Write clear messages** - Follow conventional commits
5. **Test thoroughly** - Validate syntax and functionality
6. **Review carefully** - Check diffs before pushing
7. **Document changes** - Update relevant documentation
8. **Maintain consistency** - Follow existing patterns
9. **Protect sensitive data** - Never commit secrets
10. **Collaborate effectively** - Clear PRs, responsive to feedback

## Additional Resources

- [GitHub Community Health Files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions)
- [Issue Template Syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
