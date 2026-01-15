# GitHub Copilot Custom Instructions

## Code Style and Best Practices

### General Guidelines
- Write clean, maintainable, and well-documented code
- Follow SOLID principles and DRY (Don't Repeat Yourself)
- Use meaningful variable and function names
- Add comments for complex logic
- Implement proper error handling and logging
- Write unit tests for new functionality

### Python
- Follow PEP 8 style guide
- Use type hints for function parameters and return values
- Use docstrings for modules, classes, and functions (Google style)
- Prefer f-strings for string formatting
- Use virtual environments (venv or conda)
- Use `black` for code formatting and `pylint` for linting
- Organize imports: standard library, third-party, local imports
- Use `pytest` for testing
- Handle exceptions explicitly, avoid bare `except:`

### TypeScript
- Follow TypeScript strict mode guidelines
- Use explicit types, avoid `any` when possible
- Prefer interfaces over type aliases for object shapes
- Use ESLint and Prettier for code formatting
- Follow functional programming patterns where appropriate
- Use async/await over raw promises
- Implement proper error boundaries
- Use Jest for testing
- Organize code with clear module boundaries

## Security Best Practices
- Never commit secrets, API keys, or sensitive data
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Implement proper authentication and authorization
- Use parameterized queries to prevent SQL injection
- Keep dependencies up to date
- Follow OWASP security guidelines

## Git Commit Messages
- Use conventional commits format: `type(scope): subject`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep subject line under 50 characters
- Use imperative mood: "add" not "added"

## Documentation
- Keep README.md up to date
- Document API endpoints and parameters
- Include usage examples
- Document environment variables and configuration
- Maintain CHANGELOG.md for version history

## AI Coding Agent Preferences
- Prioritize code readability over cleverness
- Suggest refactoring opportunities
- Recommend appropriate design patterns
- Consider performance implications
- Suggest security improvements
- Provide alternative approaches when relevant
