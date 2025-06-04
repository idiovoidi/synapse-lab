# Neurotransmitter Simulation

## Development Guidelines

### Code Style
- Use 2 spaces for indentation
- Use single quotes for strings
- Always use semicolons
- Follow ESLint recommendations (`npm run lint`)
- Write modular, reusable code
- Use JSDoc comments for all public classes and functions

### Commit Messages
- Use clear, descriptive commit messages
- Use present tense (e.g., "Add feature" not "Added feature")
- Reference issues or tasks when relevant (e.g., `Fix #42`)

### Branching
- Use feature branches for new features (`feature/feature-name`)
- Use bugfix branches for fixes (`bugfix/issue-description`)
- Merge to `main` via pull requests only

### Pull Requests & Code Review
- All code must be reviewed before merging
- Ensure all tests pass before submitting a PR
- Add or update tests for new features/bugfixes
- Update documentation as needed

### Testing
- Write unit tests for all new code
- Run `npm test` before pushing
- Maintain at least 80% test coverage

### Documentation
- Use JSDoc for code documentation
- Run `npm run docs` to generate/update documentation
- Keep the `README.md` up to date

### General
- Keep code DRY (Don't Repeat Yourself)
- Prefer clarity over cleverness
- Ask for help or clarification when needed 