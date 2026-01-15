# Repository Overview

This `.github` repository is the central hub for project setup, development workflows, and organizational standards.

## 📁 Repository Structure

```
.github/
├── ISSUE_TEMPLATE/           # Issue templates (7 templates)
│   ├── bug_report.yml
│   ├── feature_request.yml
│   ├── task.yml
│   ├── trading_strategy.yml
│   ├── data_issue.yml
│   ├── integration_request.yml
│   └── config.yml
│
├── docs/                     # Documentation
│   ├── WORKFLOW.md          # Complete development workflow guide
│   └── QUICK_REFERENCE.md   # Fast reference for common tasks
│
├── scripts/                  # Git helper scripts
│   ├── README.md            # Scripts documentation
│   ├── git-utils.sh         # Shared utility functions
│   ├── git-branch.sh        # Create branches
│   ├── git-sync.sh          # Sync with main
│   ├── git-cleanup.sh       # Clean merged branches
│   ├── git-status.sh        # Enhanced status
│   └── setup.sh             # Project initialization
│
├── templates/                # Project templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── project-structure/
│       ├── README.md        # Structure documentation
│       └── init-project.sh  # Project generator
│
├── .gitignore               # Comprehensive ignore patterns
├── CONTRIBUTING.md          # Contribution guidelines
├── README.md                # Main documentation
└── OVERVIEW.md             # This file

Total: 22 files
```

## 🎯 Purpose

### For New Projects
- **Quick Start**: Use `init-project.sh` to scaffold new projects
- **Structure**: Follow recommended folder structures
- **Templates**: Copy issue and PR templates

### For Development
- **Scripts**: Automate common git workflows
- **Workflow**: Follow documented development processes
- **Standards**: Maintain consistency across projects

### For Team
- **Documentation**: Centralized development guides
- **Best Practices**: Shared conventions and standards
- **Resources**: Quick reference for common tasks

## 🚀 Quick Start

### Starting a New Project
```bash
# Initialize new project
./templates/project-structure/init-project.sh my-project backend

# Or manually copy templates
cp -r templates/ ../my-project/.github/
cp scripts/ ../my-project/scripts/
```

### Using Git Scripts
```bash
# Copy to your project
cp scripts/*.sh ../my-project/scripts/

# Use in your project
cd ../my-project
./scripts/git-branch.sh feature "new-feature"
./scripts/git-status.sh
./scripts/git-sync.sh
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Main documentation and overview |
| [WORKFLOW.md](docs/WORKFLOW.md) | Complete development workflow |
| [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Fast command reference |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [scripts/README.md](scripts/README.md) | Git scripts documentation |

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `git-utils.sh` | Shared utility functions |
| `git-branch.sh` | Create feature/bugfix/hotfix branches |
| `git-sync.sh` | Sync branch with main |
| `git-cleanup.sh` | Remove merged branches |
| `git-status.sh` | Enhanced status display |
| `setup.sh` | Project initialization |

## 📋 Issue Templates

| Template | Use Case |
|----------|----------|
| Bug Report | Report bugs and issues |
| Feature Request | Propose new features |
| Task | Structured development tasks |
| Trading Strategy | Trading strategy proposals |
| Data Issue | Data quality problems |
| Integration Request | API/system integrations |

## 🏗️ Project Types Supported

The initialization script supports:

1. **Backend** - API/server projects
2. **Frontend** - Web UI projects
3. **Fullstack** - Combined frontend + backend
4. **Library** - Reusable packages
5. **Trading** - MQL5/trading projects

## 🎨 Features

### Git Scripts
- ✅ Colored output for better UX
- ✅ Error handling and validation
- ✅ Cross-platform compatible
- ✅ Interactive prompts
- ✅ Comprehensive help text

### Documentation
- ✅ Detailed workflow guides
- ✅ Quick reference cards
- ✅ Code examples
- ✅ Troubleshooting tips
- ✅ Best practices

### Templates
- ✅ Multiple project types
- ✅ Automated setup
- ✅ Consistent structure
- ✅ Pre-configured tools

## 🔄 Workflow Summary

1. **Plan** → Create issue with template
2. **Branch** → Use `git-branch.sh` 
3. **Develop** → Make changes, commit often
4. **Sync** → Keep updated with `git-sync.sh`
5. **Review** → Create PR with template
6. **Merge** → Approve and merge
7. **Cleanup** → Use `git-cleanup.sh`

## 📦 What's Included

### Documentation (4 files)
- Main README
- Workflow guide
- Quick reference
- Contributing guide

### Scripts (6 files)
- Utilities
- Branch management
- Sync operations
- Cleanup
- Status
- Setup

### Templates (3 types)
- Issue templates (7)
- PR template
- Project structures (5)

### Configuration
- .gitignore patterns
- Issue template config

## 🤝 Contributing

1. Follow [CONTRIBUTING.md](CONTRIBUTING.md)
2. Use issue templates
3. Create feature branches
4. Write clear commit messages
5. Submit PRs with template

## 📖 Learn More

- **Workflows**: See [WORKFLOW.md](docs/WORKFLOW.md)
- **Commands**: See [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)
- **Scripts**: See [scripts/README.md](scripts/README.md)
- **Templates**: See [templates/project-structure/README.md](templates/project-structure/README.md)

## 🆘 Getting Help

- Check documentation files
- Review existing issues
- Ask in discussions
- Contact maintainers

---

**Last Updated**: January 2026
**Maintained By**: xrey167
**License**: Internal use within organization
