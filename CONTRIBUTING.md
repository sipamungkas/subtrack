# Contributing to Subnudge

First off, thank you for considering contributing to Subnudge! 🎉

Every contribution matters — whether it's fixing a typo, reporting a bug, or building a new feature. This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by [opening an issue](https://github.com/sipamungkas/subtrack/issues).

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/sipamungkas/subtrack/issues) to avoid duplicates.

When you create a bug report, please include as many details as possible using the bug report template:

- **A clear and descriptive title**
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment details** (OS, Bun version, Node version, browser, etc.)

### Suggesting Features

Feature suggestions are tracked as [GitHub Issues](https://github.com/sipamungkas/subtrack/issues). When creating a feature request:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this feature would be useful** to most users
- **List any alternative solutions** you've considered

### Submitting Pull Requests

1. **Fork** the repository and create your branch from `main`
2. **Follow** the [Development Setup](#development-setup) instructions
3. **Make your changes** and add tests if applicable
4. **Run the test suite** to ensure nothing is broken
5. **Update documentation** if your changes affect it
6. **Submit** your pull request using the PR template

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)
- [PostgreSQL](https://www.postgresql.org/) (v14 or later)
- [Git](https://git-scm.com/)

### Getting Started

1. Fork the repository on GitHub

2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/subtrack.git
   cd subtrack
   ```

3. Set up the backend:
   ```bash
   cd backend
   bun install
   cp .env.example .env
   # Edit .env with your local configuration
   bun run db:migrate
   ```

4. Set up the frontend:
   ```bash
   cd frontend
   bun install
   cp .env.example .env
   ```

5. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && bun run dev

   # Terminal 2 - Frontend
   cd frontend && bun run dev
   ```

6. Run the tests:
   ```bash
   # Backend tests
   cd backend && bun run test

   # Frontend tests
   cd frontend && bun run test
   ```

## Project Structure

```
subtrack/
├── backend/         # Hono API server (Bun runtime)
│   ├── src/
│   │   ├── db/          # Database schema & connection
│   │   ├── routes/      # API route handlers
│   │   ├── middleware/   # Hono middleware
│   │   ├── services/    # Business logic
│   │   ├── bot/         # Telegram bot setup
│   │   └── lib/         # Utilities
│   └── drizzle/         # Database migrations
├── frontend/        # React + Vite SPA
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities & API client
│   │   └── types/       # TypeScript types
└── docs/            # Documentation
```

## Code Style

- **TypeScript** is used throughout the project
- **ESLint** is configured for the frontend — run `bun run lint` to check
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic, but prefer self-documenting code

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (build, CI, dependencies, etc.)

**Examples:**
```
feat(backend): add WhatsApp notification support
fix(frontend): resolve subscription card overflow on mobile
docs: update contributing guidelines
test(backend): add unit tests for reminder service
```

## Questions?

If you have any questions, feel free to [open a discussion](https://github.com/sipamungkas/subtrack/discussions) or reach out via the issue tracker.

Thank you for helping make Subnudge better! 🚀
