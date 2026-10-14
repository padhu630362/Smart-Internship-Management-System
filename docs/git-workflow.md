# Git Workflow & Collaboration Guidelines

## 1. Branching Strategy

The repository follows a structured Feature Branch Workflow with protected trunk branches:

* **`main`:** Production-ready code. Every merge to `main` must pass all automated test suites and build gates.
* **`feature/<feature-name>`:** New feature or phase development (e.g. `feature/project-foundation`, `feature/auth-system`).
* **`fix/<bug-description>`:** Bug fixes addressing defect tickets.
* **`docs/<topic>`:** Documentation updates.

---

## 2. Commit Message Standards

Commits strictly adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Allowed Types:
* **`feat`:** A new feature introduced into the system.
* **`fix`:** A bug fix.
* **`docs`:** Documentation changes only.
* **`style`:** Code formatting, missing semi-colons (no code logic changes).
* **`refactor`:** Code refactoring without behavioral alterations.
* **`test`:** Adding or refactoring automated tests.
* **`chore`:** Build configuration, dependency upgrades, or tooling updates.

### Examples:
* `feat(backend): implement centralized error handling and AppError utility`
* `docs(architecture): add system diagram and data flow specifications`
* `test(backend): add integration tests for /api/health endpoint`

---

## 3. Pull Request (PR) Checklist

Before submitting a Pull Request into `main`:
1. [ ] Branch is rebased onto the latest `main`.
2. [ ] All automated tests pass (`npm run test`).
3. [ ] Frontend builds cleanly with zero errors (`npm run build`).
4. [ ] No `.env` or sensitive credentials staged or committed.
5. [ ] Relevant documentation under `docs/` is updated.
6. [ ] PR contains a concise description of changes and testing instructions.
