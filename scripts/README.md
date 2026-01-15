# Git Helper Scripts

Collection of bash scripts to streamline your git workflow.

## Available Scripts

### 🛠️ git-utils.sh
**Purpose:** Shared utility functions for all git scripts

**Usage:**
```bash
# Source in other scripts
source "$(dirname "$0")/git-utils.sh"
```

**Provides:**
- `get_main_branch()` - Detect main/master branch
- `get_current_branch()` - Get current branch name
- `is_working_directory_clean()` - Check for uncommitted changes
- `branch_exists_local()` - Check if branch exists locally
- `branch_exists_remote()` - Check if branch exists on remote
- Error/success/warning message helpers
- Color constants for consistent output

**When to use:** When creating new git helper scripts

---

### 🚀 setup.sh
**Purpose:** Initialize project and install dependencies

**Usage:**
```bash
./scripts/setup.sh
```

**What it does:**
- Makes all scripts executable
- Installs git hooks
- Installs project dependencies (npm, pip, go)
- Creates `.env` from `.env.example`

**When to use:** First time setting up a project

---

### 🌿 git-branch.sh
**Purpose:** Create and checkout new branches with proper naming

**Usage:**
```bash
./scripts/git-branch.sh <type> <branch-name>
```

**Types:**
- `feature` - New feature development
- `bugfix` - Bug fixes
- `hotfix` - Critical production fixes
- `release` - Release preparation

**Examples:**
```bash
./scripts/git-branch.sh feature "user-authentication"
./scripts/git-branch.sh bugfix "login-error"
./scripts/git-branch.sh hotfix "security-patch"
```

**What it does:**
1. Updates main branch
2. Creates new branch from main
3. Checks out the new branch
4. Provides next steps

**Branch naming:** `<type>/<branch-name>`

---

### 🔄 git-sync.sh
**Purpose:** Sync current branch with main/master

**Usage:**
```bash
./scripts/git-sync.sh
```

**What it does:**
1. Fetches latest changes
2. Updates local main branch
3. Offers rebase or merge options
4. Provides push commands

**When to use:**
- Before creating a pull request
- When main has new commits
- To resolve potential conflicts early

**Options:**
- **Rebase** (recommended): Clean linear history
- **Merge**: Preserves branch history

**Note:** Checks for uncommitted changes first

---

### 🧹 git-cleanup.sh
**Purpose:** Remove merged branches

**Usage:**
```bash
./scripts/git-cleanup.sh
```

**What it does:**
1. Fetches latest changes with pruning
2. Finds merged branches
3. Lists branches to be deleted
4. Confirms before deletion
5. Offers to delete remote branches

**Protects:**
- Current branch
- Main/master branch
- Develop branch

**When to use:**
- After merging pull requests
- Regular repository maintenance
- Before starting new work

---

### 📊 git-status.sh
**Purpose:** Enhanced status with branch information

**Usage:**
```bash
./scripts/git-status.sh
```

**What it shows:**
- Current branch name
- Main branch name
- Commits ahead/behind main
- Working directory status
- Recent commits (last 5)
- Quick command reference

**When to use:**
- Before starting work
- Before committing
- To check repository state

**Output includes:**
- ↑ Commits ahead
- ↓ Commits behind
- ✓ Clean working directory
- ⚠ Uncommitted changes

---

## Installation

All scripts are automatically made executable when you run `setup.sh`.

Manually make executable:
```bash
chmod +x scripts/*.sh
```

## Global Installation (Optional)

To use these scripts from anywhere:

1. **Add to PATH:**
   ```bash
   echo 'export PATH="$PATH:$HOME/<project>/scripts"' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Create aliases:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   alias git-new='git-branch.sh'
   alias git-sync='git-sync.sh'
   alias git-clean='git-cleanup.sh'
   alias gst='git-status.sh'
   ```

3. **Symlink to local bin:**
   ```bash
   ln -s $(pwd)/scripts/git-*.sh ~/.local/bin/
   ```

## Script Dependencies

All scripts require:
- Bash 4.0+
- Git 2.20+
- POSIX utilities (sed, grep, etc.)

Tested on:
- ✅ Linux
- ✅ macOS
- ✅ WSL (Windows Subsystem for Linux)
- ⚠️ Git Bash (Windows) - limited color support

## Color Output

Scripts use ANSI color codes:
- 🔴 Red: Errors
- 🟢 Green: Success
- 🟡 Yellow: Warnings/Info
- 🔵 Blue: Headers
- 🟦 Cyan: Labels

To disable colors, modify scripts to unset color variables:
```bash
RED=''
GREEN=''
# etc.
```

## Troubleshooting

### "Permission denied"
```bash
chmod +x scripts/*.sh
```

### "Command not found"
```bash
# Run with explicit path
./scripts/script-name.sh

# Or add to PATH (see Global Installation)
```

### Scripts hang or freeze
- Check for interactive prompts
- Ensure git credentials are configured
- Check network connection for fetch operations

### Colors not showing
- Terminal might not support ANSI colors
- Try a different terminal emulator
- Or disable colors in scripts

## Customization

### Modify Default Branch

Edit scripts to change default branch from `main`:

```bash
# Find this line:
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@' || echo "main")

# Change fallback:
... || echo "master")
```

### Add Custom Branch Types

In `git-branch.sh`, add to the case statement:

```bash
case $TYPE in
    feature|bugfix|hotfix|release|docs|test)  # Add types here
        ;;
    *)
        echo "Invalid type"
        ;;
esac
```

### Change Color Scheme

Modify color definitions at the top of scripts:

```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
# etc.
```

## Best Practices

### Before Using Scripts

1. ✅ Understand what the script does
2. ✅ Commit or stash your changes
3. ✅ Ensure clean working directory
4. ✅ Backup important work

### Regular Usage

- Run `git-status.sh` frequently
- Use `git-sync.sh` before creating PRs
- Run `git-cleanup.sh` weekly
- Use `git-branch.sh` for consistency

### Team Usage

- Share scripts with the team
- Document customizations
- Keep scripts in version control
- Review script updates together

## Examples

### Starting New Feature

```bash
# Check current status
./scripts/git-status.sh

# Create feature branch
./scripts/git-branch.sh feature "add-payment-gateway"

# Make changes...
git add .
git commit -m "feat: add payment gateway integration"

# Push
git push -u origin feature/add-payment-gateway
```

### Updating Feature Branch

```bash
# Check status
./scripts/git-status.sh

# See you're 5 commits behind main
# Sync with main
./scripts/git-sync.sh
# Choose: 1) Rebase

# Push updated branch
git push --force-with-lease
```

### Cleaning Up After Merge

```bash
# PR merged, time to clean up
./scripts/git-cleanup.sh

# Confirms deletion of merged branches
# Deletes local and remote branches
```

## Contributing

To add new scripts:

1. Create script in `scripts/` directory
2. Add shebang: `#!/bin/bash`
3. Set error handling: `set -e`
4. Use color variables consistently
5. Add usage function
6. Document in this README
7. Make executable: `chmod +x`

## Resources

- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
- [Git Documentation](https://git-scm.com/doc)
- [ANSI Color Codes](https://en.wikipedia.org/wiki/ANSI_escape_code)

## Support

Having issues? 
- Check this documentation
- Review script source code
- Open an issue on GitHub
- Ask in team chat

---

**Happy scripting! 🚀**
