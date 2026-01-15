# Contributing Guidelines

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the Bug Report template
3. Provide detailed reproduction steps
4. Include environment information
5. Add relevant logs/screenshots

### Suggesting Features

1. Check if feature already exists or is planned
2. Use the Feature Request template
3. Explain the problem it solves
4. Describe your proposed solution
5. Consider alternatives

### Contributing Code

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
   cd REPO_NAME
   ```

2. **Setup Development Environment**
   ```bash
   ./scripts/setup.sh
   ```

3. **Create a Branch**
   ```bash
   ./scripts/git-branch.sh feature "description"
   ```

4. **Make Changes**
   - Follow code style guidelines
   - Add tests for new features
   - Update documentation
   - Keep commits focused and atomic

5. **Test Your Changes**
   ```bash
   # Run tests (adjust for your project)
   npm test        # Node.js
   pytest          # Python
   go test ./...   # Go
   ```

6. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

7. **Push and Create PR**
   ```bash
   git push -u origin your-branch-name
   ```
   
   Then create a Pull Request on GitHub with:
   - Clear title and description
   - Link to related issue
   - Screenshots for UI changes
   - List of changes made

## Development Guidelines

### Code Style

**General:**
- Use meaningful variable and function names
- Keep functions small and focused
- Comment complex logic
- Remove debug statements before committing

**JavaScript/TypeScript:**
- Use ES6+ features
- Prefer `const` over `let`
- Use async/await over promises
- 2 spaces for indentation

**Python:**
- Follow PEP 8
- Use type hints
- 4 spaces for indentation
- Document functions with docstrings

**Go:**
- Follow Go conventions
- Use `gofmt` for formatting
- Handle errors explicitly
- Write idiomatic Go code

### Testing

- Write tests for all new features
- Ensure existing tests pass
- Aim for high code coverage
- Include edge cases
- Test both success and failure paths

### Documentation

- Update README if needed
- Document new features
- Add inline comments for complex logic
- Update API documentation
- Include examples where helpful

### Commit Messages

Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Example:
```
feat(auth): add JWT authentication

- Implement token generation
- Add token validation middleware
- Update user model with token field

Closes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

### Pull Request Guidelines

**Before Submitting:**
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages are clear
- [ ] PR description is complete

**PR Description Should Include:**
- What changed and why
- How to test the changes
- Screenshots (for UI changes)
- Breaking changes (if any)
- Related issues

**During Review:**
- Respond to feedback promptly
- Make requested changes
- Keep discussions professional
- Ask questions if unclear

## Review Process

1. **Automated Checks** - CI runs tests and linting
2. **Code Review** - Team members review changes
3. **Approval** - At least one approval required
4. **Merge** - Maintainer merges the PR

## Getting Help

- Read the [Workflow Documentation](docs/WORKFLOW.md)
- Check existing issues and discussions
- Ask questions in issues or discussions
- Contact maintainers

## Project Structure

```
.
├── docs/                  # Documentation
├── scripts/              # Helper scripts
├── src/                  # Source code
├── tests/                # Test files
├── .github/              # GitHub configuration
│   ├── workflows/        # CI/CD workflows
│   └── ISSUE_TEMPLATE/   # Issue templates
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Recognition

Contributors will be:
- Listed in release notes
- Credited in documentation
- Added to CONTRIBUTORS file

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion
- Contact maintainers directly

Thank you for contributing! 🎉
