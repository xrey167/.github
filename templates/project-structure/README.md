# Project Structure Template

This directory contains templates for setting up new projects with a well-organized folder structure.

## Standard Project Structure

```
project-name/
├── .github/
│   ├── workflows/              # CI/CD workflows
│   │   ├── ci.yml             # Continuous Integration
│   │   ├── cd.yml             # Continuous Deployment
│   │   └── codeql.yml         # Security scanning
│   ├── ISSUE_TEMPLATE/         # Issue templates
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   ├── task.yml
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml          # Dependency updates
│
├── docs/                       # Documentation
│   ├── README.md              # Documentation overview
│   ├── api/                   # API documentation
│   │   └── README.md
│   ├── architecture/          # Architecture decisions
│   │   ├── README.md
│   │   └── adr/              # Architecture Decision Records
│   ├── guides/               # User/developer guides
│   │   ├── getting-started.md
│   │   ├── development.md
│   │   └── deployment.md
│   └── diagrams/             # Architecture diagrams
│
├── scripts/                   # Build, deployment, utility scripts
│   ├── setup.sh              # Initial setup
│   ├── git-branch.sh         # Git helpers
│   ├── git-sync.sh
│   ├── git-cleanup.sh
│   ├── git-status.sh
│   ├── git-hooks/            # Git hooks
│   │   ├── pre-commit
│   │   ├── commit-msg
│   │   └── pre-push
│   ├── build/                # Build scripts
│   │   ├── build.sh
│   │   └── docker-build.sh
│   ├── deploy/               # Deployment scripts
│   │   ├── deploy-staging.sh
│   │   └── deploy-prod.sh
│   └── local-dev/            # Local development
│       ├── start-db.sh
│       └── seed-data.sh
│
├── src/                       # Source code
│   ├── core/                 # Core business logic
│   │   ├── models/          # Data models
│   │   ├── services/        # Business services
│   │   └── repositories/    # Data access
│   ├── api/                  # API layer
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Middleware
│   │   └── validators/      # Input validation
│   ├── utils/                # Utilities
│   │   ├── helpers.js
│   │   ├── logger.js
│   │   └── constants.js
│   ├── config/               # Configuration
│   │   ├── index.js
│   │   ├── database.js
│   │   └── environment.js
│   └── index.js              # Application entry point
│
├── tests/                     # Test files
│   ├── unit/                 # Unit tests
│   │   ├── core/
│   │   ├── api/
│   │   └── utils/
│   ├── integration/          # Integration tests
│   │   ├── api/
│   │   └── database/
│   ├── e2e/                  # End-to-end tests
│   │   └── scenarios/
│   ├── fixtures/             # Test data
│   └── helpers/              # Test utilities
│
├── config/                    # Configuration files
│   ├── default.json          # Default config
│   ├── development.json      # Dev config
│   ├── staging.json          # Staging config
│   └── production.json       # Prod config
│
├── migrations/                # Database migrations
│   ├── 001_initial.sql
│   └── 002_add_users.sql
│
├── docker/                    # Docker configuration
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── public/                    # Static files (if web app)
│   ├── css/
│   ├── js/
│   └── images/
│
├── .gitignore                # Git ignore rules
├── .env.example              # Environment variables template
├── .editorconfig             # Editor configuration
├── .eslintrc.js              # Linter configuration
├── .prettierrc               # Code formatter config
├── package.json              # Dependencies (Node.js)
├── requirements.txt          # Dependencies (Python)
├── go.mod                    # Dependencies (Go)
├── README.md                 # Project overview
├── CONTRIBUTING.md           # Contribution guidelines
├── CHANGELOG.md              # Version history
├── LICENSE                   # License file
└── Makefile                  # Build automation
```

## Project Type Variations

### Backend API Project
Focus on:
- `src/api/` - API routes and controllers
- `src/core/` - Business logic
- `tests/integration/` - API tests
- `docs/api/` - API documentation

### Frontend Project
Focus on:
- `src/components/` - UI components
- `src/pages/` - Page components
- `src/hooks/` - Custom hooks
- `src/store/` - State management
- `public/` - Static assets

### Full-Stack Project
Combine both:
```
project-name/
├── client/                   # Frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                   # Backend
│   ├── src/
│   ├── tests/
│   └── package.json
├── shared/                   # Shared code
│   └── types/
└── package.json             # Root package
```

### Library/Package Project
Focus on:
- `src/` - Library source
- `tests/` - Comprehensive tests
- `docs/` - Usage documentation
- `examples/` - Usage examples

### MQL5/Trading Project
```
trading-project/
├── Experts/                  # Expert Advisors
├── Indicators/              # Custom indicators
├── Scripts/                 # Utility scripts
├── Include/                 # Include files
├── docs/                    # Strategy docs
└── backtests/              # Backtest results
```

## Usage

1. **Copy the structure you need**
2. **Remove unnecessary directories**
3. **Adapt to your tech stack**
4. **Add project-specific folders**

## Best Practices

### Keep it Simple
- Start with basic structure
- Add folders as needed
- Don't over-engineer early

### Consistency
- Use same structure across projects
- Follow naming conventions
- Document any deviations

### Organization
- Group related files
- Separate concerns
- Clear naming

### Documentation
- README in each major directory
- Explain non-obvious structure
- Keep it updated

## Initialization

Use the initialization script to create this structure:

```bash
./templates/project-structure/init-project.sh <project-name> <project-type>
```

Types: `backend`, `frontend`, `fullstack`, `library`, `trading`

This will:
1. Create directory structure
2. Copy template files
3. Initialize git repository
4. Setup basic configuration
5. Install git hooks
