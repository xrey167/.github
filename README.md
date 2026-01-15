# .github Repository

**Community Health Files & AI Assistant Instructions for xrey167**

## Overview

This is the organization-wide `.github` repository that provides default community health files, issue templates, AI assistant instructions, and an automated AI-Agent-System for all repositories in the organization.

## Repository Structure

```
xrey167/.github/                  # Root repository
├── .claude/                      # Claude AI instructions
│   └── instructions.md
├── .codex/                       # OpenAI Codex instructions
│   └── instructions.md
├── .gemini/                      # Gemini AI instructions
│   └── instructions.md
├── .github/                      # GitHub Copilot instructions
│   └── copilot-instructions.md
├── ISSUE_TEMPLATE/               # Organization-wide issue templates
│   ├── bug_report.yml
│   ├── config.yml
│   ├── data_issue.yml
│   ├── feature_request.yml
│   ├── integration_request.yml
│   ├── task.yml
│   └── trading_strategy.yml
└── README.md
```

## 📋 Issue Templates

The repository provides various issue templates for:
- 🐛 Bug Reports
- ✨ Feature Requests
- 📋 Tasks
- 📊 Data Issues
- 🔌 Integration Requests
- 📈 Trading Strategies

## 🤖 AI-Agent-System

### Available Agents

This repository implements an automatic agent tagging system. You can mention AI agents in issues and comments, and they will automatically respond and take on tasks.

#### @codex 🤖
- **Specialization**: Code generation and technical solutions
- **Capabilities**: 
  - Code generation
  - Bug fixes
  - Code refactoring
  - Technical documentation
  - API development

#### @copilot 🚁
- **Specialization**: Code development and problem-solving
- **Capabilities**:
  - Code development
  - Code review
  - Testing
  - Debugging
  - Best practices

#### @gemini ✨
- **Specialization**: Advanced analysis and creative approaches
- **Capabilities**:
  - Complex analysis
  - Architecture design
  - Strategic planning
  - Creative solutions
  - Multi-modal tasks

### Usage

Simply mention an agent in an issue or comment:

```markdown
@codex can you please implement the login function?
```

```markdown
@copilot this bug needs urgent fixing, see stack trace above
```

```markdown
@gemini please analyze the architecture and suggest improvements
```

### What Happens Next?

1. **Automatic Response** 🚀: The agent reacts with an emoji to your mention
2. **Confirmation**: The agent creates a comment to confirm the task
3. **Tracking**: A label (e.g., `agent:codex`) is added to track progress

### Manual Agent Management

You can also manually assign agents via workflow dispatches:

1. Go to **Actions** → **Agent Task Manager**
2. Click **Run workflow**
3. Select the agent, issue number, and action

## AI Assistant Instructions

This repository includes comprehensive instruction files for multiple AI assistants to ensure consistent and effective collaboration:

### Available Instructions

- **GitHub Copilot** (`.github/copilot-instructions.md`) - Instructions for GitHub Copilot
- **Claude AI** (`.claude/instructions.md`) - Instructions for Anthropic's Claude
- **Gemini** (`.gemini/instructions.md`) - Instructions for Google's Gemini
- **OpenAI Codex** (`.codex/instructions.md`) - Instructions for OpenAI Codex

### What's Included

Each instruction file contains:
- Git workflow and branch naming conventions
- Feature development flow and best practices
- Commit message standards (Conventional Commits)
- Function calling guidelines
- Repository-specific standards
- Security best practices
- Testing and validation procedures
- Quick reference commands
- Troubleshooting guides

## Git Workflow

### Branch Naming Convention

```
<prefix>/<description>
```

**Prefixes:**
- `feature/` - New features
- `copilot/` - AI-assisted tasks
- `fix/` - Bug fixes
- `hotfix/` - Critical fixes
- `docs/` - Documentation
- `refactor/` - Code improvements
- `test/` - Tests
- `chore/` - Maintenance

**Examples:**
```
feature/add-security-policy
copilot/setup-ai-instructions
fix/yaml-syntax-error
docs/update-readme
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat: add AI assistant instructions
fix: correct YAML indentation
docs: update README structure
chore: add .gitignore
```

## Issue Templates

This repository provides organization-wide issue templates:

- **Bug Report** - Report bugs and issues
- **Feature Request** - Suggest new features
- **Data Issue** - Report data quality issues
- **Integration Request** - Request integrations
- **Task** - General tasks
- **Trading Strategy** - Trading strategy proposals

## 🔧 Configuration

Agent configuration can be managed through GitHub Actions workflows. See the **Actions** tab for available agent management workflows.

## Usage

### For Repository Members

These instructions are automatically available when working with AI assistants in any repository within the organization.

### For AI Assistants

AI assistants should reference the appropriate instruction file from this repository to understand:
- How to work with git in this organization
- Branch naming and commit message conventions
- Feature development workflow
- Repository-specific best practices

## Contributing

When making changes to this repository:

1. Create a branch following the naming convention
2. Make focused, minimal changes
3. Test all changes (especially issue templates)
4. Use conventional commit messages
5. Create a pull request with clear description
6. Request review if needed

## Resources

- [GitHub Community Health Files Documentation](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions)
- [Issue Forms Syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
