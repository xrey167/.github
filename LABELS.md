# GitHub Labels Configuration

Diese Datei definiert empfohlene Labels für das Repository. Labels können über die GitHub UI oder via API/CLI erstellt werden.

## 📋 Label-Kategorien

### Priority (Priorität)

| Name | Color | Description |
|------|-------|-------------|
| `priority:critical` | `#d73a4a` | 🔴 Critical - System nicht nutzbar, sofortige Aktion erforderlich |
| `priority:high` | `#ff9800` | 🟠 High - Wichtige Funktion beeinträchtigt |
| `priority:medium` | `#ffc107` | 🟡 Medium - Workaround vorhanden |
| `priority:low` | `#4caf50` | 🟢 Low - Kosmetisch oder Minor |

### Type (Art)

| Name | Color | Description |
|------|-------|-------------|
| `bug` | `#d73a4a` | 🐛 Etwas funktioniert nicht wie erwartet |
| `enhancement` | `#a2eeef` | ✨ Neue Feature oder Verbesserung |
| `feature` | `#0e8a16` | 🚀 Neue Funktion |
| `task` | `#1d76db` | 📋 Entwicklungsaufgabe |
| `data` | `#fbca04` | 📊 Daten-bezogenes Issue |
| `integration` | `#5319e7` | 🔌 API/System-Integration |
| `strategy` | `#006b75` | 📈 Trading-Strategie |
| `documentation` | `#0075ca` | 📝 Dokumentation |
| `question` | `#d876e3` | ❓ Frage oder Diskussion |

### Status

| Name | Color | Description |
|------|-------|-------------|
| `triage` | `#fbca04` | 🏷️ Needs initial triage/review |
| `in-progress` | `#0e8a16` | 🏗️ Currently being worked on |
| `blocked` | `#d73a4a` | 🚫 Blocked by dependencies |
| `review` | `#ff9800` | 👀 Waiting for review |
| `done` | `#6f42c1` | ✅ Completed |
| `wont-fix` | `#ffffff` | 🙅 Will not be addressed |
| `duplicate` | `#cfd3d7` | 🔂 Duplicate issue |
| `stale` | `#e4e669` | ⏰ No recent activity |

### Area/Component

| Name | Color | Description |
|------|-------|-------------|
| `area:backend` | `#0052cc` | Backend/Server code |
| `area:frontend` | `#5319e7` | Frontend/UI code |
| `area:api` | `#1d76db` | API endpoints |
| `area:database` | `#006b75` | Database related |
| `area:devops` | `#0e8a16` | DevOps/Infrastructure |
| `area:ci-cd` | `#ffc107` | CI/CD pipelines |
| `area:trading` | `#006b75` | Trading logic |
| `area:security` | `#d73a4a` | Security related |

### Size (PR Size)

| Name | Color | Description |
|------|-------|-------------|
| `size:XS` | `#00ff00` | Extra Small: < 10 lines |
| `size:S` | `#7fff00` | Small: 10-50 lines |
| `size:M` | `#ffff00` | Medium: 50-200 lines |
| `size:L` | `#ff8c00` | Large: 200-500 lines |
| `size:XL` | `#ff0000` | Extra Large: > 500 lines |

### Special

| Name | Color | Description |
|------|-------|-------------|
| `good first issue` | `#7057ff` | 👶 Good for newcomers |
| `help wanted` | `#008672` | 🆘 Looking for contributors |
| `dependencies` | `#0366d6` | 📦 Dependency updates |
| `breaking change` | `#d73a4a` | 💥 Breaking changes |
| `needs:investigation` | `#d876e3` | 🔍 Needs research |
| `needs:design` | `#e99695` | 🎨 Needs design/UX work |
| `needs:testing` | `#0e8a16` | 🧪 Needs additional testing |
| `performance` | `#ff9800` | ⚡ Performance related |
| `refactoring` | `#5319e7` | 🔧 Code refactoring |
| `technical-debt` | `#d73a4a` | 🏗️ Technical debt |

## 🛠️ Labels erstellen

### Via GitHub UI

1. Gehe zu Repository → **Issues** → **Labels**
2. Klicke auf **New label**
3. Name, Color und Description eingeben
4. **Create label**

### Via GitHub CLI

```bash
# Einzelne Labels erstellen
gh label create "priority:critical" --color d73a4a --description "🔴 Critical priority"

# Aus Datei importieren (siehe labels.json unten)
gh label create --file labels.json
```

### Via API

```bash
# Mit curl
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/labels \
  -d '{"name":"priority:critical","color":"d73a4a","description":"🔴 Critical priority"}'
```

## 📄 labels.json

Erstelle eine `labels.json` für Bulk-Import:

```json
[
  {
    "name": "priority:critical",
    "color": "d73a4a",
    "description": "🔴 Critical - Immediate action required"
  },
  {
    "name": "priority:high",
    "color": "ff9800",
    "description": "🟠 High priority"
  },
  {
    "name": "priority:medium",
    "color": "ffc107",
    "description": "🟡 Medium priority"
  },
  {
    "name": "priority:low",
    "color": "4caf50",
    "description": "🟢 Low priority"
  },
  {
    "name": "bug",
    "color": "d73a4a",
    "description": "🐛 Something isn't working"
  },
  {
    "name": "enhancement",
    "color": "a2eeef",
    "description": "✨ New feature or request"
  },
  {
    "name": "documentation",
    "color": "0075ca",
    "description": "📝 Documentation"
  },
  {
    "name": "good first issue",
    "color": "7057ff",
    "description": "👶 Good for newcomers"
  },
  {
    "name": "help wanted",
    "color": "008672",
    "description": "🆘 Extra attention is needed"
  }
]
```

### Script zum Bulk-Erstellen

```bash
#!/bin/bash
# create-labels.sh

OWNER="your-org"
REPO="your-repo"
TOKEN="your-github-token"

# Array of labels
declare -A LABELS=(
  ["priority:critical"]="d73a4a:🔴 Critical priority"
  ["priority:high"]="ff9800:🟠 High priority"
  ["priority:medium"]="ffc107:🟡 Medium priority"
  ["priority:low"]="4caf50:🟢 Low priority"
  ["bug"]="d73a4a:🐛 Bug"
  ["enhancement"]="a2eeef:✨ Enhancement"
  ["documentation"]="0075ca:📝 Documentation"
)

for label in "${!LABELS[@]}"; do
  IFS=':' read -r color description <<< "${LABELS[$label]}"
  
  echo "Creating label: $label"
  
  curl -X POST \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/labels" \
    -d "{\"name\":\"$label\",\"color\":\"$color\",\"description\":\"$description\"}" \
    -s > /dev/null
done

echo "Labels created!"
```

## 🔄 Label Workflows

### Auto-Labeling

Labels werden automatisch durch GitHub Actions zugewiesen:

- `.github/workflows/auto-label.yml` - Basierend auf Dateien, Branch, Content
- `.github/workflows/issue-management.yml` - Basierend auf Issue-Template

### Manual Commands

Issues und PRs können über Kommentare gelabelt werden:

```
/label priority:high
/label bug, backend
/priority critical
```

## 📊 Label Usage Guidelines

### Für Issues

**Mindestens 2 Labels**:
1. **Type**: Was ist es? (bug, feature, task, etc.)
2. **Priority**: Wie wichtig ist es?

**Optional**:
- **Area**: Welcher Bereich ist betroffen?
- **Status**: Aktueller Bearbeitungsstatus

**Beispiel**:
- `bug`, `priority:high`, `area:backend`, `in-progress`

### Für Pull Requests

**Automatisch**:
- **Size**: XS, S, M, L, XL (basierend auf Anzahl Änderungen)
- **Area**: Backend, Frontend, etc. (basierend auf geänderten Dateien)

**Manuell**:
- **Type**: Feature, bugfix, refactoring
- **breaking change**: Falls zutreffend

## 🧹 Label Maintenance

### Review Labels

Regelmäßig Labels überprüfen und aufräumen:

```bash
# Ungenutzte Labels finden
gh label list --json name,issues | \
  jq '.[] | select(.issues == 0) | .name'

# Label löschen
gh label delete "old-label"

# Label umbenennen (delete + create)
gh label delete "old-name"
gh label create "new-name" --color "color" --description "desc"
```

### Best Practices

- ✅ Konsistente Naming Convention (prefix:name)
- ✅ Klare Descriptions mit Emojis
- ✅ Nicht zu viele Labels (max 30-40)
- ✅ Regelmäßig aufräumen
- ❌ Keine redundanten Labels
- ❌ Keine vagen Descriptions

## 📚 Weitere Ressourcen

- [GitHub Docs - Managing Labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)
- [GitHub CLI - Labels](https://cli.github.com/manual/gh_label)
- [Label Actions](https://github.com/marketplace/actions/label-actions)

---

**Mit einem guten Label-System behältst du den Überblick über alle Issues und PRs! 🏷️**
