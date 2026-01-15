# Beispiel: Repository mit diesem Template einrichten

Dieses Dokument zeigt ein vollständiges Beispiel, wie ein neues Repository mit diesem Best-Practice-Template eingerichtet wird.

## 📖 Szenario

Wir erstellen ein neues Trading-Bot-Repository mit:
- Python Backend
- React Frontend
- MQL5 Trading Strategies
- GitHub Actions CI/CD

## 🚀 Schritt-für-Schritt Anleitung

### 1. Repository erstellen

```bash
# Neues Repository auf GitHub erstellen
gh repo create my-trading-bot --public --description "Automated trading bot"

# Template klonen und kopieren
git clone https://github.com/xrey167/.github.git template
cd my-trading-bot

# .github Struktur kopieren
cp -r ../template/.github .

# Initial commit
git add .
git commit -m "Initial commit with best practice template"
git push origin main
```

### 2. CODEOWNERS konfigurieren

```bash
# .github/CODEOWNERS editieren
cat > .github/CODEOWNERS << 'EOF'
# CODEOWNERS for my-trading-bot

# Global owners
* @trading-team-lead

# Backend
/backend/ @backend-team @trading-team-lead
/api/ @backend-team
*.py @backend-team

# Frontend
/frontend/ @frontend-team
/ui/ @frontend-team
*.tsx @frontend-team
*.jsx @frontend-team

# Trading Strategies
/strategies/ @trading-team @quant-team
*.mq5 @trading-team

# DevOps
/.github/workflows/ @devops-team
Dockerfile @devops-team
docker-compose.yml @devops-team

# Documentation
*.md @docs-team

# Configuration
/config/ @devops-team @trading-team-lead
EOF

git add .github/CODEOWNERS
git commit -m "Configure CODEOWNERS for trading bot"
git push
```

### 3. Labels erstellen

```bash
# Script erstellen
cat > create-labels.sh << 'EOF'
#!/bin/bash

# Priority Labels
gh label create "priority:critical" --color d73a4a --description "🔴 Critical priority" --force
gh label create "priority:high" --color ff9800 --description "🟠 High priority" --force
gh label create "priority:medium" --color ffc107 --description "🟡 Medium priority" --force
gh label create "priority:low" --color 4caf50 --description "🟢 Low priority" --force

# Type Labels
gh label create "bug" --color d73a4a --description "🐛 Bug" --force
gh label create "enhancement" --color a2eeef --description "✨ Enhancement" --force
gh label create "feature" --color 0e8a16 --description "🚀 Feature" --force
gh label create "task" --color 1d76db --description "📋 Task" --force
gh label create "documentation" --color 0075ca --description "📝 Documentation" --force

# Area Labels
gh label create "area:backend" --color 0052cc --description "Backend code" --force
gh label create "area:frontend" --color 5319e7 --description "Frontend code" --force
gh label create "area:trading" --color 006b75 --description "Trading logic" --force
gh label create "area:devops" --color 0e8a16 --description "DevOps/Infrastructure" --force

# Status Labels
gh label create "triage" --color fbca04 --description "Needs triage" --force
gh label create "in-progress" --color 0e8a16 --description "In progress" --force
gh label create "blocked" --color d73a4a --description "Blocked" --force

# Special Labels
gh label create "good first issue" --color 7057ff --description "👶 Good for newcomers" --force
gh label create "help wanted" --color 008672 --description "🆘 Help wanted" --force

echo "✅ Labels created!"
EOF

chmod +x create-labels.sh
./create-labels.sh
```

### 4. Branch Protection einrichten

```bash
# main Branch schützen (via GitHub UI oder API)

# Via GitHub CLI
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build","test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true}' \
  --field restrictions=null

# develop Branch erstellen und schützen
git checkout -b develop
git push origin develop

gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build","test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

### 5. GitHub Project erstellen

```bash
# Via GitHub UI:
# 1. Gehe zu Projects → New Project
# 2. Wähle "Board" Template
# 3. Name: "Trading Bot Development"

# Spalten erstellen:
# - 📥 Backlog
# - 📋 To Do
# - 🏗️ In Progress  
# - 👀 In Review
# - ✅ Done

# Custom Fields hinzufügen:
# - Priority (Single select): Critical, High, Medium, Low
# - Sprint (Single select): Sprint 1, Sprint 2, ...
# - Effort (Number): Story points
# - Team (Single select): Backend, Frontend, Trading, DevOps

# Automation aktivieren:
# - When: Item added → Set Status: Backlog
# - When: Pull request merged → Set Status: Done
# - When: Issue closed → Set Status: Done
```

### 6. CI/CD Workflows einrichten

```bash
# Backend Tests Workflow
cat > .github/workflows/backend-ci.yml << 'EOF'
name: Backend CI

on:
  pull_request:
    paths:
      - 'backend/**'
      - '*.py'
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest --cov=backend tests/
      
      - name: Lint
        run: |
          pip install flake8 black mypy
          flake8 backend/
          black --check backend/
          mypy backend/
EOF

# Frontend Tests Workflow
cat > .github/workflows/frontend-ci.yml << 'EOF'
name: Frontend CI

on:
  pull_request:
    paths:
      - 'frontend/**'
      - '*.tsx'
      - '*.jsx'
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
EOF

git add .github/workflows/
git commit -m "Add CI workflows for backend and frontend"
git push
```

### 7. Erstes Issue erstellen

```bash
# Epic Issue für User Authentication
gh issue create \
  --title "[TASK] Implement User Authentication" \
  --label "task,priority:high,area:backend" \
  --body "## Ziel
Implement JWT-based user authentication with login, logout, and token refresh.

## Lieferumfang

**In Scope:**
- JWT token generation and validation
- Login/Logout endpoints
- Token refresh mechanism
- User session management

**Out of Scope:**
- OAuth integration (separate issue)
- Password reset (separate issue)

## Akzeptanzkriterien
- [ ] User can login with email/password
- [ ] JWT token is returned on successful login
- [ ] Token can be refreshed before expiry
- [ ] User can logout (token invalidation)
- [ ] All endpoints have proper error handling

## Aufgaben
- [ ] Design database schema for users
- [ ] Implement login endpoint
- [ ] Implement logout endpoint
- [ ] Implement token refresh endpoint
- [ ] Add JWT middleware
- [ ] Write unit tests
- [ ] Write integration tests

## Tests
- [ ] Unit tests for auth service
- [ ] Integration tests for auth endpoints
- [ ] Manual testing with Postman

## Validierung
- [ ] All acceptance criteria met
- [ ] Code review passed
- [ ] 80%+ test coverage
- [ ] No security vulnerabilities (CodeQL)

Epic: #1 User Management"
```

### 8. Feature Branch & PR erstellen

```bash
# Feature Branch erstellen
git checkout develop
git pull origin develop
git checkout -b feature/1-user-authentication

# Code implementieren...
# (Backend Auth Service, Tests, etc.)

# Committen
git add backend/auth/
git commit -m "feat(auth): Implement JWT authentication (#1)

- Add JWT token generation and validation
- Implement login/logout endpoints
- Add token refresh mechanism
- Add comprehensive tests

Implements #1"

# Push und PR erstellen
git push origin feature/1-user-authentication

gh pr create \
  --title "[FEATURE] Implement User Authentication" \
  --body "## Beschreibung
Implements JWT-based authentication system.

## Verknüpfte Issues
Closes #1

## Art der Änderung
- [x] New Feature

## Testing
- [x] Unit Tests (auth service)
- [x] Integration Tests (endpoints)
- [x] Manual Testing

All tests passing: 45/45 ✅

## Checkliste
- [x] Code follows conventions
- [x] Self-review completed
- [x] Tests added
- [x] Documentation updated
- [x] No secrets in code

## Security
- [x] JWT secrets from environment
- [x] Password hashing with bcrypt
- [x] Input validation
- [x] Rate limiting on auth endpoints" \
  --base develop \
  --label "feature,area:backend,priority:high"
```

### 9. Code Review & Merge

```bash
# Als Reviewer:
gh pr checkout 2
# Review Code...
gh pr review 2 --approve --body "LGTM! ✅ 

Code looks good:
- Clean implementation
- Good test coverage
- Proper error handling
- Security best practices followed"

# Als Autor (nach Approval):
gh pr merge 2 --squash --delete-branch
```

### 10. Monitoring & Metrics

```bash
# Check CI/CD Status
gh run list

# Check stale issues
gh issue list --label stale

# Project Progress
# Via GitHub UI: Projects → Trading Bot Development

# Security Alerts
gh api repos/:owner/:repo/dependabot/alerts

# Code Scanning
gh api repos/:owner/:repo/code-scanning/alerts
```

## 📊 Ergebnis nach Setup

### Repository-Struktur

```
my-trading-bot/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   ├── task.yml
│   │   └── ...
│   ├── workflows/
│   │   ├── pr-checks.yml
│   │   ├── issue-management.yml
│   │   ├── auto-label.yml
│   │   ├── stale.yml
│   │   ├── backend-ci.yml
│   │   └── frontend-ci.yml
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   ├── BRANCH_PROTECTION.md
│   ├── PROJECTS_SETUP.md
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   ├── LABELS.md
│   └── README.md
├── backend/
│   ├── auth/
│   ├── api/
│   └── tests/
├── frontend/
│   ├── src/
│   └── tests/
├── strategies/
│   └── *.mq5
├── README.md
├── requirements.txt
├── package.json
└── docker-compose.yml
```

### Aktivierte Features

✅ Branch Protection (main, develop)
✅ Issue Templates (6 verschiedene)
✅ PR Template
✅ Auto-Labeling
✅ Issue Management Commands
✅ Stale Issue Handling
✅ CODEOWNERS
✅ CI/CD Workflows
✅ Security Scanning
✅ GitHub Projects

### Team-Workflow

```
1. Issue erstellen (mit Template)
   ↓
2. Automatic Label/Project Add
   ↓
3. Sprint Planning (Project Board)
   ↓
4. Feature Branch erstellen
   ↓
5. Development & Commits
   ↓
6. PR erstellen (mit Template)
   ↓
7. Automatic Checks (CI, Linting, Security)
   ↓
8. Code Review (CODEOWNERS)
   ↓
9. Approval (2 für main, 1 für develop)
   ↓
10. Merge & Auto-close Issue
    ↓
11. Project Status Update (Done)
```

## 🎓 Learnings

### Was gut funktioniert

✅ **Automatische Labels**: Spart Zeit, konsistente Kategorisierung
✅ **Issue Templates**: Strukturierte, vollständige Issue-Beschreibungen
✅ **Branch Protection**: Verhindert Breaking Changes
✅ **CODEOWNERS**: Automatische Reviewer-Zuweisung
✅ **Project Automation**: Transparenter Überblick über Fortschritt

### Verbesserungsvorschläge

💡 **Regelmäßige Backlog Grooming**: Wöchentlich, um Backlog clean zu halten
💡 **Sprint Retrospectives**: Am Ende jedes Sprints, um Prozess zu optimieren
💡 **Metrics Dashboard**: GitHub Insights nutzen für Cycle Time, Lead Time
💡 **Custom Workflows**: Projektspezifische Automations entwickeln

## 📚 Nächste Schritte

1. **Team Onboarding**: Alle Entwickler mit dem Workflow vertraut machen
2. **Documentation**: Projekt-spezifische Docs hinzufügen
3. **Monitoring**: Prometheus/Grafana für App-Monitoring
4. **Alerts**: Slack/Discord Integration für wichtige Events
5. **Releases**: Semantic Versioning und Release-Automation

---

**Dieses Beispiel zeigt, wie ein vollständig konfiguriertes Repository mit Best Practices aussieht! 🚀**
