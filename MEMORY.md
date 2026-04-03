# MEMORY

This file records the most recent 50 design and code changes in this project.

## Maintenance Rules

1. Update this file after every completed design or code change.
2. Each entry must include at least: time, change summary, purpose, result, and affected files.
3. Keep entries in reverse chronological order, with the newest entry first.
4. Keep at most 50 entries in total. Remove the oldest entry when the count exceeds 50.
5. If one task changes multiple files for the same objective, record them in a single entry.

## Entry Template

```md
### [ID] Title
- Time: YYYY-MM-DD HH:MM:SS +08:00
- Change: ...
- Purpose: ...
- Result: ...
- Files: `path/a`, `path/b`
```

## Recent Change Log

### [002] Added Standalone Ruff Configuration
- Time: 2026-04-03 17:45:40 +08:00
- Change: Added a dedicated `ruff.toml` file with lint, isort, and format settings, and configured first-party imports for the current repository layout.
- Purpose: Keep Ruff configuration separate from `pyproject.toml` and match import sorting to the actual project modules.
- Result: The repository now uses a standalone Ruff config file with `known-first-party` set to `src` and `server`.
- Files: `ruff.toml`, `MEMORY.md`

### [001] Created Project Change Memory File
- Time: 2026-04-03 17:06:52 +08:00
- Change: Added `MEMORY.md` at the repository root and defined a standard logging format, required fields, and the retention rule for the latest 50 entries.
- Purpose: Provide persistent project-level memory for recent design and code updates, reduce context loss, and make recent changes easier to review.
- Result: The project now has a reusable change log file that can be updated after each real modification while keeping only the latest 50 entries.
- Files: `MEMORY.md`
