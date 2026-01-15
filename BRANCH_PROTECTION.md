# Branch Protection Rules - Best Practices

Dieses Dokument beschreibt die empfohlenen Branch Protection Rules für professionelle Software-Entwicklung mit Fokus auf Agent Programming und Code Quality.

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Branch-Strategie](#branch-strategie)
- [Protection Rules für main](#protection-rules-für-main)
- [Protection Rules für develop](#protection-rules-für-develop)
- [Protection Rules für Feature Branches](#protection-rules-für-feature-branches)
- [Setup-Anleitung](#setup-anleitung)
- [GitHub Actions Integration](#github-actions-integration)

## 🎯 Übersicht

Branch Protection Rules schützen wichtige Branches vor direkten Änderungen und erzwingen einen strukturierten Review-Prozess. Dies ist besonders wichtig für:

- ✅ **Code Quality**: Sicherstellen, dass Code reviewed wurde
- ✅ **Stabilität**: Verhindern von Breaking Changes in Produktion
- ✅ **Nachvollziehbarkeit**: Alle Änderungen über Pull Requests
- ✅ **Compliance**: Erfüllen von Audit-Anforderungen
- ✅ **Agent Programming**: Strukturierter Review-Prozess für KI-generierten Code

## 🌿 Branch-Strategie

### Branch-Typen und Zweck

```
main (production)
  ↑
develop (integration)
  ↑
feature/*, bugfix/*, hotfix/* (development)
```

| Branch | Zweck | Merge aus | Merge nach |
|--------|-------|-----------|------------|
| `main` | Produktions-Code | `develop`, `hotfix/*` | - |
| `develop` | Integration, Testing | `feature/*`, `bugfix/*` | `main` |
| `feature/*` | Neue Features | `develop` | `develop` |
| `bugfix/*` | Bug-Fixes | `develop` | `develop` |
| `hotfix/*` | Dringende Prod-Fixes | `main` | `main`, `develop` |
| `release/*` | Release-Vorbereitung | `develop` | `main`, `develop` |

### Branch-Naming Convention

```
feature/ISSUE-123-user-authentication
bugfix/ISSUE-456-login-error
hotfix/ISSUE-789-security-patch
release/v1.2.0
```

## 🔒 Protection Rules für `main`

Der `main` Branch enthält produktionsreifen Code und sollte maximal geschützt sein.

### Erforderliche Einstellungen

#### ✅ Require pull request reviews before merging

- **Anzahl erforderlicher Approvals**: mindestens **2**
- **Dismiss stale pull request approvals when new commits are pushed**: ✅ **Aktiviert**
- **Require review from Code Owners**: ✅ **Aktiviert**
- **Restrict who can dismiss pull request reviews**: Optional (Team-Leads, Admins)
- **Require approval of the most recent reviewable push**: ✅ **Aktiviert**

#### ✅ Require status checks to pass before merging

- **Require branches to be up to date before merging**: ✅ **Aktiviert**

**Erforderliche Status Checks**:
```
- CI/Build
- Tests (Unit, Integration)
- Code Quality (Linting, SonarQube)
- Security Scan (CodeQL, Snyk)
- Documentation Check
```

#### ✅ Require conversation resolution before merging

Alle Review-Kommentare müssen resolved sein bevor Merge möglich ist.

#### ✅ Require signed commits (optional, empfohlen)

Stellt sicher, dass Commits verifiziert sind.

#### ✅ Require linear history (optional)

Verhindert Merge-Commits, erzwingt Rebase/Squash.

#### ❌ Allow force pushes: **DEAKTIVIERT**

#### ❌ Allow deletions: **DEAKTIVIERT**

#### ✅ Restrict who can push to matching branches

Nur spezifische Teams/Personen können direkt pushen (z.B. nur für Hotfixes).

### Zusätzliche Empfehlungen

- **Require deployments to succeed before merging**: Optional, für Staging-Deploys
- **Lock branch**: Für Release-Freezes temporär aktivieren
- **CODEOWNERS File**: Automatische Reviewer-Zuweisung

## 🔧 Protection Rules für `develop`

Der `develop` Branch ist weniger streng geschützt als `main`, aber immer noch kontrolliert.

### Erforderliche Einstellungen

#### ✅ Require pull request reviews before merging

- **Anzahl erforderlicher Approvals**: mindestens **1**
- **Dismiss stale pull request approvals when new commits are pushed**: ✅ **Aktiviert**
- **Require review from Code Owners**: ✅ **Aktiviert** (optional)

#### ✅ Require status checks to pass before merging

- **Require branches to be up to date before merging**: ✅ **Aktiviert**

**Erforderliche Status Checks**:
```
- CI/Build
- Tests (Unit)
- Linting
- Basic Security Scan
```

#### ✅ Require conversation resolution before merging

#### ❌ Allow force pushes: **DEAKTIVIERT**

#### ❌ Allow deletions: **DEAKTIVIERT**

## 🌱 Protection Rules für Feature Branches

Feature Branches können weniger streng geschützt werden, aber sollten dennoch Best Practices folgen.

### Empfohlene Einstellungen (Optional)

Für Pattern: `feature/*`, `bugfix/*`, `hotfix/*`

- **Require pull request reviews**: Optional (1 Approval)
- **Require status checks**: CI/Build, Tests
- **Allow force pushes**: ✅ Erlaubt (für Rebases)
- **Allow deletions**: ✅ Erlaubt (nach Merge)

## 🛠️ Setup-Anleitung

### Via GitHub Web UI

1. Gehe zu **Repository Settings** → **Branches**
2. Klicke auf **Add branch protection rule**
3. Branch name pattern eingeben (z.B. `main`)
4. Konfiguriere die gewünschten Rules
5. Speichern

### Via GitHub API

```bash
# Beispiel für main Branch
curl -X PUT \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_pull_request_reviews": {
      "required_approving_review_count": 2,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true
    },
    "required_status_checks": {
      "strict": true,
      "contexts": ["CI/Build", "Tests"]
    },
    "enforce_admins": true,
    "restrictions": null,
    "required_conversation_resolution": true,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

### Via Terraform (Infrastructure as Code)

```hcl
resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.node_id
  pattern       = "main"

  required_pull_request_reviews {
    required_approving_review_count = 2
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
  }

  required_status_checks {
    strict   = true
    contexts = ["CI/Build", "Tests", "Security Scan"]
  }

  enforce_admins                  = true
  require_conversation_resolution = true
  allow_force_pushes             = false
  allow_deletions                = false
}
```

## 🤖 GitHub Actions Integration

### Required Status Checks

Erstelle Workflows, die als Required Status Checks fungieren:

**`.github/workflows/pr-checks.yml`**:
```yaml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  build:
    name: CI/Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build

  test:
    name: Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: npm test

  lint:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Lint
        run: npm run lint

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v2
```

### Auto-merge für dependabot

```yaml
name: Auto-merge Dependabot PRs

on:
  pull_request:
    branches: [develop]

jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Enable auto-merge
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

## 📊 Best Practices für Agent Programming

### Review-Prozess für KI-generierten Code

1. **Automatische Checks**: Alle CI/CD Checks müssen grün sein
2. **Human Review**: Mindestens 1 menschlicher Reviewer erforderlich
3. **Security Scan**: Automatischer Security-Scan bei jedem PR
4. **Documentation**: Agent-generierter Code muss dokumentiert sein
5. **Testing**: Automatische Tests für alle Änderungen

### Workflow-Empfehlungen

```yaml
# Agent erstellt Branch
feature/AGENT-123-implement-feature

# Agent erstellt PR mit:
- Beschreibung der Änderungen
- Links zu Issue/Task
- Test-Ergebnisse
- Dokumentation

# Automatische Checks laufen:
✓ Build
✓ Tests
✓ Linting
✓ Security Scan
✓ Documentation Check

# Menschlicher Review:
- Code-Qualität
- Business-Logik
- Edge Cases
- Performance

# Approval → Merge
```

## 🔍 Monitoring & Compliance

### Branch Protection Monitoring

- **GitHub Insights**: Branch Protection Status
- **Audit Log**: Änderungen an Protection Rules tracken
- **Compliance Reports**: Regelmäßige Reviews der Einstellungen

### Metrics

- Pull Request Merge Time
- Code Review Coverage
- Failed Status Checks Rate
- Direct Push Attempts (sollte 0 sein)

## 📚 Weitere Ressourcen

- [GitHub Docs - Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs - Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [GitHub Docs - CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

## 🔄 Regelmäßige Reviews

Branch Protection Rules sollten regelmäßig überprüft und angepasst werden:

- **Monatlich**: Status Check Requirements überprüfen
- **Quartalsweise**: Reviewer-Requirements anpassen
- **Bei Team-Änderungen**: CODEOWNERS aktualisieren
- **Nach Incidents**: Rules entsprechend verschärfen

---

**Hinweis**: Diese Regeln sind Empfehlungen. Passe sie an die Bedürfnisse deines Teams und Projekts an.
