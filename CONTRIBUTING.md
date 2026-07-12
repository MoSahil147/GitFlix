# Contributing to GitFlix

Thanks for your interest in contributing. This guide covers everything you need to get started.

## Before you build anything

Open a GitHub issue first. Describe what you want to add or fix and why. This lets maintainers give early feedback before you spend time on an implementation that may not fit the project direction.

## Setup

See [AGENTS.md](AGENTS.md) for the full technical reference. The short version:

**Backend**
```bash
cd backend
uv sync
cp .env.example .env   # add GROQ_API_KEY (required) and GITHUB_TOKEN (recommended)
uv run uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000
npm run dev
```

## Workflow

1. **Fork** the repository on GitHub.
2. **Create a branch** from `main` with a descriptive name:
   ```
   git checkout -b fix/progress-bar-contrast
   git checkout -b feat/dark-mode-toggle
   ```
3. **Make your changes.** Keep each commit focused on one thing.
4. **Run the test suites** before opening a PR:
   ```bash
   cd backend && uv run pytest
   cd frontend && npm test
   ```
5. **Open a pull request** against `main`. Reference the issue number in the PR description.

## Commit messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`.

Examples:
```
feat(a11y): add keyboard navigation to chapter buttons
fix(api): handle missing GROQ_API_KEY gracefully
docs: update AGENTS.md with new test commands
```

## Code style

**Backend (Python)**
- Python 3.11+. Use `Optional[X]` for nullable types.
- Use built-in generics: `list[X]`, `dict[K, V]`.
- No comments that describe *what* the code does — only *why* (hidden constraints, workarounds, non-obvious invariants).
- No em-dashes, exclamation points, or casual filler in comments.

**Frontend (TypeScript / React)**
- Strict TypeScript. All shared constants live in `remotion/constants.ts`.
- Prefer CSS classes over inline JS `onMouseEnter`/`onMouseLeave` hover handlers.
- No `type="button"` is missing on non-form buttons.
- All interactive elements must have an accessible name (`aria-label` or visible text).
- Run `npm run lint` and fix all ESLint errors before opening a PR.

## Tests

- **Backend**: add a test in the appropriate `test_*.py` file when you change logic in `analytics/`, `ingestion/`, or `agent/`.
- **Frontend**: add a test in `src/screens/__tests__/` or `src/utils.test.ts` for any new pure functions or interactive behaviours.
- Tests must pass before a PR can be merged.

## What we will not merge

- Features not backed by an open issue.
- PRs that break existing tests without a clear reason.
- Code with AI-generated filler comments, casual language, or typos.
- Accessibility regressions (contrast, keyboard navigation, ARIA roles).
