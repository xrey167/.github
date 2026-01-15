# GitHub Copilot Instructions for .github Repository

## Repository Overview
This is the organization-wide `.github` repository that provides default community health files, issue templates, and AI assistant instructions for all repositories in the organization.

## Git Workflow and Branch Naming Conventions

### Branch Naming
Follow this standardized branch naming convention:
- **Feature branches**: `feature/<short-description>` or `copilot/<task-description>`
- **Bug fixes**: `fix/<issue-description>`
- **Hotfixes**: `hotfix/<critical-issue>`
- **Documentation**: `docs/<what-is-documented>`
- **Refactoring**: `refactor/<what-is-refactored>`

### Branch Examples
```
copilot/setup-copilot-instructions
feature/add-security-policy
fix/broken-issue-template
docs/update-contributing-guide
```

## Feature Flow Process

### 1. Planning Phase
- Review the issue or feature request thoroughly
- Understand the requirements and acceptance criteria
- Identify affected files and components
- Plan minimal, targeted changes

### 2. Development Phase
```bash
# Create and checkout new branch
git checkout -b feature/<description>

# Make incremental changes
# Test each change before proceeding

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat: brief description of change"
```

### 3. Commit Message Conventions
Follow conventional commits format:
- `feat:` - New feature or enhancement
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Formatting, missing semicolons, etc.
- `refactor:` - Code restructuring without behavior change
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 4. Review and Merge
```bash
# Push branch to remote
git push origin feature/<description>

# Create pull request
# Request review if needed
# Address feedback

# After approval, merge to main
```

## Function Calling Guidelines

### When to Use Function Calls
- **File Operations**: Always use proper tools for reading, creating, editing files
- **Git Operations**: Use git commands through bash tool for status, diff, log
- **Search Operations**: Use grep for content search, glob for file patterns
- **Code Analysis**: Use view tool to examine code structure

### Function Call Best Practices
1. **Parallel Execution**: Execute independent operations simultaneously
2. **Sequential Dependencies**: Wait for results when operations depend on each other
3. **Error Handling**: Check command outputs before proceeding
4. **Minimal Changes**: Make surgical, targeted modifications

### Common Function Call Patterns
```
# Parallel file reads (independent)
- view file1.md
- view file2.yml
- view file3.txt

# Sequential git operations (dependent)
- bash: git status
- bash: git diff (after reviewing status)
- bash: git add . (after reviewing diff)
```

## Repository-Specific Best Practices

### Issue Templates
- Maintain consistent YAML structure
- Include clear labels and descriptions
- Test templates before committing
- Ensure all required fields are present

### Documentation
- Keep README.md concise and up-to-date
- Use clear, actionable language
- Include examples where helpful
- Maintain consistent formatting

### AI Assistant Instructions
- Keep instructions focused and actionable
- Update when workflows change
- Test instructions with actual use cases
- Include both what to do and what to avoid

### Code Quality
- No secrets or credentials in files
- Use clear, descriptive file names
- Follow YAML/Markdown best practices
- Validate syntax before committing

## Workflow Commands Reference

### Common Git Commands
```bash
# Check repository status
git status

# View changes
git diff

# View commit history
git log --oneline -10

# Create new branch
git checkout -b <branch-name>

# Stage all changes
git add .

# Commit changes
git commit -m "type: description"

# Push to remote
git push origin <branch-name>

# Pull latest changes
git pull origin main
```

### Repository Maintenance
```bash
# List all branches
git branch -a

# Delete local branch
git branch -d <branch-name>

# Update from main
git checkout main
git pull origin main
git checkout <feature-branch>
git merge main
```

## Testing and Validation

### Before Committing
1. Review all changed files
2. Validate YAML/Markdown syntax
3. Test issue template functionality (if modified)
4. Ensure no sensitive data is included
5. Verify branch naming follows conventions

### Validation Commands
```bash
# Check for syntax errors in YAML
yamllint <file>.yml

# Check Markdown formatting
markdownlint <file>.md

# Review changes before commit
git diff --staged
```

## Collaboration Guidelines

### Pull Request Best Practices
- Write clear, descriptive PR titles
- Include context in PR description
- Reference related issues
- Keep PRs focused and small
- Request reviews when appropriate

### Code Review Focus Areas
- Correctness of templates
- Consistency with existing patterns
- Documentation completeness
- No security concerns

## Quick Reference

### Creating New Issue Templates
1. Use YAML format
2. Place in `ISSUE_TEMPLATE/` directory
3. Include name, description, labels
4. Define form fields with validation
5. Test on GitHub before merging

### Updating Instructions
1. Create branch: `docs/update-<assistant>-instructions`
2. Make changes to relevant instruction file
3. Test instructions with example scenarios
4. Create PR with clear description
5. Merge after validation

## Important Notes

- This repository affects all organization repositories
- Changes here are immediately visible organization-wide
- Always test templates before merging
- Keep instructions clear and actionable
- Update instructions when workflows evolve
# GitHub Copilot Custom Instructions

## Code Style and Best Practices

### General Guidelines
- Write clean, maintainable, and well-documented code
- Follow SOLID principles and DRY (Don't Repeat Yourself)
- Use meaningful variable and function names
- Add comments for complex logic
- Implement proper error handling and logging
- Write unit tests for new functionality

### Python
- Follow PEP 8 style guide
- Use type hints for function parameters and return values
- Use docstrings for modules, classes, and functions (Google style)
- Prefer f-strings for string formatting
- Use virtual environments (venv or conda)
- Use `black` for code formatting and `pylint` for linting
- Organize imports: standard library, third-party, local imports
- Use `pytest` for testing
- Handle exceptions explicitly, avoid bare `except:`

### TypeScript
- Follow TypeScript strict mode guidelines
- Use explicit types, avoid `any` when possible
- Prefer interfaces over type aliases for object shapes
- Use ESLint and Prettier for code formatting
- Follow functional programming patterns where appropriate
- Use async/await over raw promises
- Implement proper error boundaries
- Use Jest for testing
- Organize code with clear module boundaries

## Security Best Practices
- Never commit secrets, API keys, or sensitive data
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Implement proper authentication and authorization
- Use parameterized queries to prevent SQL injection
- Keep dependencies up to date
- Follow OWASP security guidelines

## Git Commit Messages
- Use conventional commits format: `type(scope): subject`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep subject line under 50 characters
- Use imperative mood: "add" not "added"

## Documentation
- Keep README.md up to date
- Document API endpoints and parameters
- Include usage examples
- Document environment variables and configuration
- Maintain CHANGELOG.md for version history

## AI Coding Agent Preferences
- Prioritize code readability over cleverness
- Suggest refactoring opportunities
- Recommend appropriate design patterns
- Consider performance implications
- Suggest security improvements
- Provide alternative approaches when relevant
