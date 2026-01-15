# Contributing Guidelines

Vielen Dank für dein Interesse, zu diesem Projekt beizutragen! Diese Guidelines helfen dir, effektiv zum Projekt beizutragen.

## 📋 Inhaltsverzeichnis

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)

## 🤝 Code of Conduct

- Sei respektvoll und inklusiv
- Konstruktives Feedback geben
- Fokus auf das Problem, nicht die Person
- Hilfsbereitschaft und Geduld zeigen

## 🚀 Getting Started

### Prerequisites

Stelle sicher, dass du folgendes installiert hast:

```bash
# Git
git --version

# Node.js (falls relevant)
node --version
npm --version

# Python (falls relevant)
python --version

# Weitere projekt-spezifische Tools...
```

### Fork & Clone

1. **Fork** das Repository auf GitHub
2. **Clone** deinen Fork:

```bash
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
cd REPO_NAME
```

3. **Remote hinzufügen** für Upstream:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/REPO_NAME.git
```

4. **Sync** mit Upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### Setup

```bash
# Dependencies installieren
npm install
# oder
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Editiere .env mit deinen Settings

# Projekt bauen
npm run build

# Tests ausführen
npm test
```

## 🔄 Development Workflow

### 1. Issue erstellen oder auswählen

- Prüfe existierende Issues
- Erstelle neues Issue für neue Features/Bugs
- Warte auf Approval bevor du startest (bei größeren Changes)

### 2. Branch erstellen

```bash
# Sync mit main
git checkout main
git pull upstream main

# Neuen Branch erstellen
git checkout -b feature/ISSUE-123-short-description
```

### 3. Entwickeln

- Schreibe sauberen, dokumentierten Code
- Folge Code-Style Guidelines
- Schreibe/Update Tests
- Teste lokal

### 4. Committen

```bash
# Stage changes
git add .

# Commit mit aussagekräftiger Message
git commit -m "feat: Add user authentication (#123)"

# Push zu deinem Fork
git push origin feature/ISSUE-123-short-description
```

### 5. Pull Request erstellen

- Öffne PR auf GitHub
- Fülle PR-Template aus
- Verlinke Related Issues
- Warte auf Review

## 🌿 Branch Strategy

### Branch-Typen

| Prefix | Zweck | Beispiel |
|--------|-------|----------|
| `feature/` | Neue Features | `feature/user-auth` |
| `bugfix/` | Bug Fixes | `bugfix/login-error` |
| `hotfix/` | Dringende Prod-Fixes | `hotfix/security-patch` |
| `refactor/` | Code Refactoring | `refactor/api-endpoints` |
| `docs/` | Dokumentation | `docs/api-reference` |
| `test/` | Tests hinzufügen | `test/user-service` |
| `chore/` | Maintenance | `chore/update-deps` |

### Naming Convention

```
<type>/<issue-number>-<short-description>

Beispiele:
feature/123-user-authentication
bugfix/456-fix-login-error
hotfix/789-security-vulnerability
```

## 💬 Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: Neue Features
- **fix**: Bug Fixes
- **docs**: Dokumentation
- **style**: Formatierung (keine Code-Änderung)
- **refactor**: Code Refactoring
- **test**: Tests hinzufügen/ändern
- **chore**: Maintenance, Dependencies

### Beispiele

```bash
feat(auth): Add JWT authentication

Implement JWT-based authentication with refresh tokens.
Includes login, logout, and token refresh endpoints.

Closes #123

---

fix(api): Fix null pointer exception in user service

Handle case where user profile is not yet created.

Fixes #456

---

docs(readme): Update installation instructions

Add missing prerequisites and troubleshooting section.
```

### Best Practices

- ✅ Verwende Präsens: "Add feature" nicht "Added feature"
- ✅ Erste Zeile < 50 Zeichen
- ✅ Body erklärt WARUM, nicht WAS
- ✅ Referenziere Issues: "Closes #123", "Fixes #456"
- ❌ Keine generischen Messages: "Fix bug", "Update"

## 🔍 Pull Requests

### Vor dem PR

- [ ] Code funktioniert lokal
- [ ] Alle Tests bestehen
- [ ] Code ist dokumentiert
- [ ] Keine Linter-Warnings
- [ ] Branch ist up-to-date mit base branch

### PR Beschreibung

Fülle das PR-Template vollständig aus:

1. **Beschreibung**: Was wurde geändert und warum?
2. **Verknüpfte Issues**: `Closes #123`, `Related #456`
3. **Art der Änderung**: Bug Fix, Feature, Breaking Change, etc.
4. **Testing**: Wie wurde getestet?
5. **Checkliste**: Alle Punkte abarbeiten
6. **Screenshots**: Bei UI-Änderungen

### PR Review-Prozess

1. **Automatische Checks**: CI/CD muss grün sein
2. **Code Review**: Mindestens 1 Approval erforderlich
3. **Änderungen**: Feedback adressieren
4. **Merge**: Nach Approval durch Maintainer

### Review-Kommentare adressieren

```bash
# Neue Commits pushen
git add .
git commit -m "fix: Address review comments"
git push origin feature/branch-name

# Oder: Commits zusammenfassen
git rebase -i HEAD~3
git push --force origin feature/branch-name
```

## 🎨 Code Style

### Allgemeine Prinzipien

- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **SOLID**: Single Responsibility, etc.
- **Readable**: Code wird öfter gelesen als geschrieben

### Language-Specific

#### JavaScript/TypeScript

```javascript
// ✅ Good
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad
function calc(x) {
  let t = 0;
  for (let i = 0; i < x.length; i++) {
    t = t + x[i].price;
  }
  return t;
}
```

#### Python

```python
# ✅ Good
def calculate_total(items: List[Item]) -> float:
    """Calculate total price of items."""
    return sum(item.price for item in items)

# ❌ Bad
def calc(x):
    t = 0
    for i in x:
        t = t + i.price
    return t
```

### Formatting

```bash
# JavaScript/TypeScript
npm run lint
npm run format

# Python
black .
flake8 .
mypy .
```

## 🧪 Testing

### Test-Typen

1. **Unit Tests**: Einzelne Funktionen/Klassen
2. **Integration Tests**: Zusammenspiel von Komponenten
3. **E2E Tests**: End-to-End User-Flows

### Test Coverage

- Mindestens 80% Coverage für neue Features
- 100% für kritische Business-Logik
- Edge Cases abdecken

### Running Tests

```bash
# Alle Tests
npm test

# Specific Test
npm test -- user.test.js

# Coverage Report
npm run test:coverage

# Watch Mode
npm run test:watch
```

### Test-Best Practices

```javascript
// ✅ Good: Descriptive, isolated, focused
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      const user = await userService.createUser(userData);
      
      expect(user.id).toBeDefined();
      expect(user.name).toBe('John');
    });

    it('should throw error for invalid email', async () => {
      const userData = { name: 'John', email: 'invalid' };
      
      await expect(userService.createUser(userData))
        .rejects.toThrow('Invalid email');
    });
  });
});
```

## 📝 Documentation

### Code Documentation

```javascript
/**
 * Calculate the total price of items in the cart.
 * 
 * @param {Item[]} items - Array of items with price property
 * @param {number} taxRate - Tax rate (default: 0.19)
 * @returns {number} Total price including tax
 * @throws {Error} If items array is empty
 * 
 * @example
 * const total = calculateTotal([
 *   { name: 'Book', price: 10 },
 *   { name: 'Pen', price: 2 }
 * ], 0.19);
 * // Returns: 14.28
 */
function calculateTotal(items, taxRate = 0.19) {
  if (items.length === 0) {
    throw new Error('Items array cannot be empty');
  }
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
}
```

### README Updates

- Neue Features in README dokumentieren
- API-Änderungen updaten
- Examples hinzufügen
- Breaking Changes hervorheben

### Wiki/Docs

- Komplexe Features im Wiki dokumentieren
- Architecture Decisions dokumentieren
- Setup-Guides aktuell halten

## 🐛 Bug Reports

Verwende das **Bug Report Template** mit:

- Klare Beschreibung
- Schritte zur Reproduktion
- Erwartetes vs. tatsächliches Verhalten
- Environment Details
- Screenshots/Logs

## ✨ Feature Requests

Verwende das **Feature Request Template** mit:

- Problem/Motivation
- Vorgeschlagene Lösung
- Alternativen
- Akzeptanzkriterien

## 🔒 Security

- **Keine Secrets** in Code committen
- **Security Issues** privat melden (siehe SECURITY.md)
- **Dependencies** regelmäßig updaten
- **Code Scans** beachten (CodeQL, Snyk)

## 📞 Fragen?

- **Discussions**: Für allgemeine Fragen
- **Issues**: Für Bugs und Features
- **Email**: Für private Anfragen

## 🙏 Danke!

Danke für deinen Beitrag zum Projekt! Jede Contribution, egal wie groß oder klein, wird geschätzt.

---

**Happy Coding! 🚀**
