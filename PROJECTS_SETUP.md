# GitHub Projects Setup Guide

Dieser Guide zeigt, wie du GitHub Projects für effektives Projektmanagement und Issue-Tracking einrichtest, insbesondere für Agent Programming Workflows.

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Project Board Templates](#project-board-templates)
- [Setup-Anleitung](#setup-anleitung)
- [Automation & Workflows](#automation--workflows)
- [Best Practices](#best-practices)
- [Agent Programming Integration](#agent-programming-integration)

## 🎯 Übersicht

GitHub Projects (V2) bietet flexible Projektmanagement-Funktionen:

- 📊 **Board View**: Kanban-Style Board für visuelles Management
- 📋 **Table View**: Spreadsheet-View für detaillierte Übersicht
- 📈 **Roadmap View**: Timeline für langfristige Planung
- 🤖 **Automation**: Automatische Status-Updates und Workflows
- 🔗 **Integration**: Nahtlose Integration mit Issues und PRs

## 📐 Project Board Templates

### 1. Kanban Board (Standard)

Klassisches Kanban-Board für Sprint-orientierte Entwicklung.

**Spalten**:
```
📥 Backlog → 📋 To Do → 🏗️ In Progress → 👀 In Review → ✅ Done
```

**Verwendung**:
- Neue Issues landen automatisch in "Backlog"
- Team zieht Issues in "To Do" für Sprint
- Entwickler bewegt zu "In Progress" beim Start
- Automatisch zu "In Review" bei PR-Erstellung
- Automatisch zu "Done" bei PR-Merge

### 2. Team Backlog

Für langfristige Planung und Priorisierung.

**Spalten**:
```
📝 Ideas → 🎯 Planned → 🚀 This Sprint → 🏗️ In Progress → ✅ Done
```

**Custom Fields**:
- Priority (High, Medium, Low)
- Effort (1, 2, 3, 5, 8, 13)
- Sprint (Sprint 1, Sprint 2, ...)
- Team (Backend, Frontend, DevOps)

### 3. Bug Triage Board

Spezialisiert für Bug-Management.

**Spalten**:
```
🐛 New Bugs → 🔍 Triage → 📋 To Fix → 🛠️ Fixing → ✅ Fixed → 🚀 Released
```

**Custom Fields**:
- Severity (Critical, High, Medium, Low)
- Affected Version
- Target Fix Version
- Reporter

### 4. Feature Development

Für größere Feature-Entwicklung mit Epics.

**Spalten**:
```
💡 Ideation → 📐 Design → 🏗️ Development → 🧪 Testing → 🚀 Launch
```

**Custom Fields**:
- Epic
- Feature Flag
- Launch Date
- Owner

## 🛠️ Setup-Anleitung

### Schritt 1: Project erstellen

1. Gehe zu deinem Repository oder Organization
2. Klicke auf **Projects** Tab
3. **New Project** → **Board** oder **Table**
4. Gib dem Project einen Namen

### Schritt 2: Views konfigurieren

#### Board View

```
Settings → Views → Board
- Group by: Status
- Slice by: Priority (optional)
```

#### Table View

```
Settings → Views → Table
- Columns: Title, Status, Priority, Assignee, Labels
- Sort by: Priority (High → Low)
- Filter: Status != Done
```

#### Roadmap View

```
Settings → Views → Roadmap
- Start date field: Start Date
- End date field: Target Date
- Markers: Sprint milestones
```

### Schritt 3: Custom Fields hinzufügen

```
Settings → Fields → Add field

Empfohlene Custom Fields:

1. Priority
   - Type: Single select
   - Options: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low

2. Effort (Story Points)
   - Type: Single select
   - Options: 1, 2, 3, 5, 8, 13, 21

3. Sprint
   - Type: Single select
   - Options: Sprint 1, Sprint 2, ...

4. Team/Area
   - Type: Single select
   - Options: Backend, Frontend, DevOps, QA

5. Epic
   - Type: Text
   - Format: #123 oder Epic-Name

6. Target Date
   - Type: Date
   - Usage: Für Roadmap View
```

### Schritt 4: Issues zum Project hinzufügen

#### Manuell

1. Öffne das Project
2. **+** Button unten
3. Issue suchen und hinzufügen

#### Automatisch

```yaml
# .github/workflows/add-to-project.yml
name: Add Issues to Project

on:
  issues:
    types: [opened]

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/ORG/projects/1
          github-token: ${{ secrets.ADD_TO_PROJECT_PAT }}
```

## 🤖 Automation & Workflows

### Built-in Automations

GitHub Projects bietet native Automations:

#### Status Auto-Updates

```
Settings → Workflows

1. Item added to project
   → Set Status to "Backlog"

2. Item closed
   → Set Status to "Done"

3. Pull request merged
   → Set Status to "Done"

4. Issue reopened
   → Set Status to "To Do"
```

#### Auto-Archive

```
Settings → Workflows

Auto-archive items
- When: Status is "Done"
- After: 30 days
```

### GitHub Actions Integration

**Automatisches Project-Update bei PR-Status**:

```yaml
name: Update Project on PR

on:
  pull_request:
    types: [opened, ready_for_review, closed]

jobs:
  update-project:
    runs-on: ubuntu-latest
    steps:
      - name: Update to In Review
        if: github.event.pull_request.draft == false
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/ORG/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          field-name: Status
          field-value: In Review

      - name: Update to Done
        if: github.event.pull_request.merged == true
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/ORG/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          field-name: Status
          field-value: Done
```

**Automatische Sprint-Zuweisung**:

```yaml
name: Assign to Current Sprint

on:
  issues:
    types: [labeled]

jobs:
  assign-sprint:
    if: github.event.label.name == 'sprint'
    runs-on: ubuntu-latest
    steps:
      - name: Get current sprint
        id: sprint
        run: |
          # Logik um aktuellen Sprint zu ermitteln
          echo "sprint=Sprint 12" >> $GITHUB_OUTPUT

      - name: Update project field
        uses: titoportas/update-project-fields@v0.1.0
        with:
          project-url: https://github.com/orgs/ORG/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          item-id: ${{ github.event.issue.node_id }}
          field-keys: Sprint
          field-values: ${{ steps.sprint.outputs.sprint }}
```

## 📊 Best Practices

### 1. Klare Status-Definitionen

Definiere klar, was jeder Status bedeutet:

| Status | Definition | Entry Criteria | Exit Criteria |
|--------|------------|----------------|---------------|
| **Backlog** | Noch nicht geplant | Issue erstellt | Für Sprint geplant |
| **To Do** | Sprint-Backlog | Sprint-Planung | Entwicklung startet |
| **In Progress** | Aktiv in Bearbeitung | Developer assigned | Code committed |
| **In Review** | PR offen | PR erstellt | PR approved + merged |
| **Done** | Abgeschlossen | PR merged | - |

### 2. Regular Grooming

- **Weekly Backlog Grooming**: Issues priorisieren und schätzen
- **Sprint Planning**: Issues für nächsten Sprint auswählen
- **Daily Standup**: Board-Status checken
- **Retrospective**: Workflow optimieren

### 3. Custom Fields sinnvoll nutzen

```
Priority + Effort = Prioritäts-Matrix

🔴 Critical + 1-3 Effort = SOFORT
🟠 High + 1-3 Effort = Dieser Sprint
🟡 Medium + >5 Effort = Aufteilen
🟢 Low + >8 Effort = Backlog
```

### 4. Milestones & Iterations

Verknüpfe Issues mit Milestones:

```
Milestone: Q1 2024 Release
↳ Epic: User Authentication
  ↳ Feature: Login Page
  ↳ Feature: OAuth Integration
  ↳ Feature: Password Reset
```

### 5. Labels als Filter

Nutze Labels für schnelles Filtern:

```
priority:high
type:bug
area:backend
status:blocked
needs:review
good-first-issue
```

## 🤖 Agent Programming Integration

### Issue-Templates für Agents

Strukturierte Issues helfen Agents, den Kontext zu verstehen:

```markdown
## Context
- Related: #123, #456
- Epic: User Management
- Dependencies: None

## Task Description
Clear, step-by-step description of what needs to be done.

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Technical Notes
- Use library X
- Follow pattern Y
- Consider edge case Z
```

### Automated Agent Workflows

**Agent-Triggered Project Updates**:

```yaml
name: Agent Project Update

on:
  issue_comment:
    types: [created]

jobs:
  update-status:
    if: contains(github.event.comment.body, '/status')
    runs-on: ubuntu-latest
    steps:
      - name: Parse status command
        id: parse
        run: |
          # Parse: /status in-progress
          STATUS=$(echo "${{ github.event.comment.body }}" | grep -oP '/status \K\S+')
          echo "status=$STATUS" >> $GITHUB_OUTPUT

      - name: Update project
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/ORG/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          field-name: Status
          field-value: ${{ steps.parse.outputs.status }}
```

### Metrics & Reporting

Track Agent-Performance mit Project-Insights:

```
Insights → Create Chart

1. Velocity Chart
   - X-Axis: Sprint
   - Y-Axis: Effort (Sum)
   - Filter: Status = Done

2. Cycle Time
   - X-Axis: Week
   - Y-Axis: Days (Avg)
   - Calculation: Done Date - Start Date

3. Agent Contribution
   - X-Axis: Assignee
   - Y-Axis: Issues (Count)
   - Filter: Labels contains "agent-generated"
```

### Quality Gates

Definiere Quality Gates für Agent-Code:

```yaml
# Required checks before moving to "Done"
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
```

## 📈 Advanced Features

### 1. GraphQL API Integration

Automatisches Project-Management via API:

```graphql
mutation AddItemToProject {
  addProjectV2ItemById(input: {
    projectId: "PROJECT_ID"
    contentId: "ISSUE_ID"
  }) {
    item {
      id
    }
  }
}
```

### 2. Bulk Operations

Nutze GitHub CLI für Bulk-Updates:

```bash
# Alle High-Priority Issues zu Sprint 12 zuweisen
gh issue list --label "priority:high" --json number -q '.[].number' | \
  xargs -I {} gh project item-add 1 --owner ORG --issue {}
```

### 3. Cross-Repository Projects

Organization-Level Projects für multiple Repos:

```
Organization Projects
↳ Repository 1 Issues
↳ Repository 2 Issues
↳ Repository 3 Issues
```

### 4. Custom Dashboards

Erstelle Views für verschiedene Stakeholder:

- **Developer View**: Filtered by assignee
- **Manager View**: High-level roadmap
- **QA View**: Items in testing/review
- **Product View**: Feature progress

## 📚 Weitere Ressourcen

- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [Projects API Reference](https://docs.github.com/en/graphql/reference/objects#projectv2)
- [Project Automation Examples](https://github.com/actions/add-to-project)
- [Best Practices Guide](https://github.blog/2022-07-27-planning-next-to-your-code-github-projects-is-now-generally-available/)

## 🔄 Migration von Projects (Classic)

Falls du noch Projects (Classic) nutzt:

1. Gehe zu Organization → Projects
2. Wähle Classic Project
3. **...** Menü → **Copy to new project**
4. Review & Confirm

---

**Mit GitHub Projects behältst du den Überblick über alle Issues, PRs und Agent-generierten Tasks in einem zentralen Board!**
