# .github Repository

This repository contains shared GitHub configuration, issue templates, and project setup resources for all repositories in this organization.

## 📋 Contents

- **Issue Templates** - Standardized templates for bugs, features, tasks, trading strategies, data issues, and integrations
- **Project Structure** - Recommended folder structure for new projects
- **Git Scripts** - Helper scripts for local development workflow
- **Workflows Documentation** - Guidelines for development processes

## 🏗️ Project Structure Template

When starting a new project, use the following folder structure:

```
project-name/
├── .github/
│   ├── workflows/          # CI/CD workflows
│   ├── ISSUE_TEMPLATE/     # Copy from this repo
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                   # Documentation
│   ├── api/               # API documentation
│   ├── architecture/      # Architecture decisions
│   └── guides/            # User guides
├── scripts/               # Build, deployment, and utility scripts
│   ├── git-hooks/        # Git hooks
│   └── local-dev/        # Local development helpers
├── src/                   # Source code
│   ├── core/             # Core business logic
│   ├── api/              # API layer
│   ├── utils/            # Utilities
│   └── config/           # Configuration
├── tests/                 # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## 🔧 Git Scripts

Local development helper scripts are available in the `/scripts` directory (to be created in your project):

### Quick Setup
```bash
# Clone and initialize a new project
git clone <repo-url>
cd <project-name>
./scripts/setup.sh  # Run initial setup
```

### Common Git Workflows
```bash
# Create a feature branch
./scripts/git-branch.sh feature "branch-name"

# Create a bugfix branch
./scripts/git-branch.sh bugfix "branch-name"

# Update branch from main
./scripts/git-sync.sh

# Clean up merged branches
./scripts/git-cleanup.sh
```

## 📝 Issue Templates

This repository provides the following issue templates:

1. **🐛 Bug Report** - For reporting bugs and issues
2. **✨ Feature Request** - For requesting new features
3. **📋 Task** - For structured development tasks
4. **📈 Trading Strategy** - For trading strategy proposals (domain-specific)
5. **📊 Data Issue** - For data quality problems (domain-specific)
6. **🔌 Integration Request** - For API/system integrations

## 🚀 Development Workflow

### 1. Planning Phase
- Create issue using appropriate template
- Define acceptance criteria
- Estimate complexity
- Assign to milestone/sprint

### 2. Development Phase
- Create feature branch: `feature/<issue-number>-<short-description>`
- Implement changes
- Write tests
- Update documentation
- Commit regularly with meaningful messages

### 3. Review Phase
- Create pull request
- Request code review
- Address feedback
- Ensure CI passes

### 4. Merge & Deploy
- Merge to main branch
- Deploy to staging/production
- Verify deployment
- Close related issues

## 🤝 Contributing

See individual project's CONTRIBUTING.md for specific guidelines.

### General Guidelines
- Follow the established code style
- Write meaningful commit messages
- Keep pull requests focused
- Update documentation
- Add tests for new features

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Git Best Practices](https://github.com/git-guides)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 📄 License

Configuration and templates in this repository are available for use within the organization.
