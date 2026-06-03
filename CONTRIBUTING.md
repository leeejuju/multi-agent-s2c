# Contributing Guide

## Commit Message Convention

This repository uses Conventional Commits.

Format:

```text
<type>(<scope>): <subject>
```

Examples:

```text
feat(agent): add stream response endpoint
fix(chat): handle empty message payload
refactor(config): split model options
doc(readme): add backend startup steps
chore(deps): update dependencies
```

Rules:

- `type` should be one of: `feat`, `fix`, `refactor`, `doc`, `test`, `chore`, `build`, `ci`.
- `scope` is recommended and should describe the changed module, such as `agent`, `chat`, `web`, `deps`.
- `subject` uses lowercase imperative form and should be concise (recommended <= 72 characters).
- Commit messages must be written in English.
- Do not wrap commit messages, subjects, or scopes with `@` characters.
- Keep one commit focused on one change.

## Pull Request Checklist

- Include a short summary and motivation.
- Link the issue/task ID when available.
- For UI changes in `web/`, include screenshot(s) or video.
- Add verification notes (commands run and outcomes).
