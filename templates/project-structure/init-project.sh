#!/bin/bash

# Project Initialization Script
# Usage: ./init-project.sh <project-name> <project-type>
# Types: backend, frontend, fullstack, library, trading

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 <project-name> <project-type>"
    echo ""
    echo "Project Types:"
    echo "  backend   - Backend API project"
    echo "  frontend  - Frontend web project"
    echo "  fullstack - Full-stack web project"
    echo "  library   - Library/Package project"
    echo "  trading   - MQL5/Trading project"
    echo ""
    echo "Example: $0 my-awesome-api backend"
    exit 1
}

# Check arguments
if [ $# -ne 2 ]; then
    usage
fi

PROJECT_NAME=$1
PROJECT_TYPE=$2
PROJECT_DIR="$HOME/projects/$PROJECT_NAME"

# Validate project type
case $PROJECT_TYPE in
    backend|frontend|fullstack|library|trading)
        ;;
    *)
        echo -e "${RED}Error: Invalid project type '$PROJECT_TYPE'${NC}"
        usage
        ;;
esac

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Project Initialization Tool        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Project Name:${NC} $PROJECT_NAME"
echo -e "${YELLOW}Project Type:${NC} $PROJECT_TYPE"
echo -e "${YELLOW}Location:${NC} $PROJECT_DIR"
echo ""

# Check if directory exists
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Directory '$PROJECT_DIR' already exists!${NC}"
    exit 1
fi

# Create project directory
echo -e "${YELLOW}Creating project directory...${NC}"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Initialize git
echo -e "${YELLOW}Initializing git repository...${NC}"
git init
echo -e "${GREEN}✓ Git repository initialized${NC}"

# Create basic structure common to all projects
echo -e "${YELLOW}Creating project structure...${NC}"

mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p docs/{api,architecture,guides}
mkdir -p scripts/{build,deploy,git-hooks,local-dev}
mkdir -p tests/{unit,integration,e2e}

# Create .gitignore
cat > .gitignore << 'EOF'
# See the organization's .github repository for more patterns

# Dependencies
node_modules/
vendor/
__pycache__/

# Environment
.env
.env.local

# Build output
dist/
build/
out/

# Logs
*.log
logs/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Temporary
tmp/
temp/
EOF

# Create README.md
cat > README.md << EOF
# $PROJECT_NAME

Description of your project.

## Getting Started

### Prerequisites

- List prerequisites here

### Installation

\`\`\`bash
git clone <repository-url>
cd $PROJECT_NAME
./scripts/setup.sh
\`\`\`

### Usage

\`\`\`bash
# How to run the project
\`\`\`

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Documentation

- [API Documentation](docs/api/README.md)
- [Architecture](docs/architecture/README.md)
- [Development Guide](docs/guides/development.md)

## License

[Specify License]
EOF

# Create type-specific structure
case $PROJECT_TYPE in
    backend)
        echo -e "${YELLOW}Setting up backend project structure...${NC}"
        mkdir -p src/{core/{models,services,repositories},api/{routes,controllers,middleware,validators},utils,config}
        mkdir -p tests/{unit/{core,api,utils},integration/{api,database}}
        mkdir -p config migrations
        
        cat > src/index.js << 'EOF'
// Application entry point
console.log('Hello from backend!');
EOF
        
        cat > package.json << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "Backend API project",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/"
  }
}
EOF
        ;;
        
    frontend)
        echo -e "${YELLOW}Setting up frontend project structure...${NC}"
        mkdir -p src/{components,pages,hooks,store,utils,assets}
        mkdir -p public/{css,js,images}
        mkdir -p tests/{unit,integration,e2e}
        
        cat > src/index.js << 'EOF'
// Application entry point
console.log('Hello from frontend!');
EOF
        
        cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
EOF
        ;;
        
    fullstack)
        echo -e "${YELLOW}Setting up full-stack project structure...${NC}"
        mkdir -p client/{src,public}
        mkdir -p server/{src,tests}
        mkdir -p shared/types
        
        cd client
        mkdir -p src/{components,pages,hooks,store}
        cd ..
        
        cd server
        mkdir -p src/{core,api,utils,config}
        cd ..
        ;;
        
    library)
        echo -e "${YELLOW}Setting up library project structure...${NC}"
        mkdir -p src/{core,utils}
        mkdir -p tests/{unit,integration}
        mkdir -p examples
        mkdir -p types
        
        cat > src/index.js << 'EOF'
// Library entry point
module.exports = {
  // Export your library functions
};
EOF
        ;;
        
    trading)
        echo -e "${YELLOW}Setting up trading project structure...${NC}"
        mkdir -p Experts Indicators Scripts Include
        mkdir -p backtests docs/strategies
        
        cat > docs/README.md << 'EOF'
# Trading Project

## Strategies

Document your trading strategies here.

## Backtests

Results of backtests are stored in the `backtests/` directory.
EOF
        ;;
esac

# Copy git scripts from template repo
echo -e "${YELLOW}Setting up git helper scripts...${NC}"

# Since we might not have access to the template repo files directly,
# we'll create basic versions of the scripts
cat > scripts/setup.sh << 'EOFSCRIPT'
#!/bin/bash
# Basic setup script
set -e
echo "Running project setup..."
chmod +x scripts/*.sh
if [ -f "package.json" ]; then npm install; fi
if [ -f "requirements.txt" ]; then pip install -r requirements.txt; fi
echo "✓ Setup complete!"
EOFSCRIPT

chmod +x scripts/setup.sh

# Create .env.example
cat > .env.example << 'EOF'
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=

# API Keys
API_KEY=
EOF

# Create CONTRIBUTING.md
cat > CONTRIBUTING.md << 'EOF'
# Contributing

Thank you for contributing!

## Development Setup

1. Clone the repository
2. Run `./scripts/setup.sh`
3. Create a feature branch
4. Make your changes
5. Submit a pull request

See the main .github repository for detailed guidelines.
EOF

# Create initial commit
echo -e "${YELLOW}Creating initial commit...${NC}"
git add .
git commit -m "feat: initial project setup

- Initialize $PROJECT_TYPE project structure
- Add basic configuration files
- Setup git helper scripts"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Project initialized successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_DIR"
echo "  2. Review and update README.md"
echo "  3. Update .env.example with your variables"
echo "  4. Create remote repository and push:"
echo "     git remote add origin <repository-url>"
echo "     git push -u origin main"
echo ""
echo "Happy coding! 🚀"
