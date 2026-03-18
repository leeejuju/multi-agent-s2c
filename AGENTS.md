# Repository Guidelines

## Project Structure & Module Organization
- `main.py` is the current Python entry point.
- `src/` contains core backend code:
  - `src/agents/` for agent abstractions and implementations.
  - `src/configs/` for runtime/model configuration objects.
  - `src/utils/` for shared helpers (for example logging).
- `server/router/` contains FastAPI route modules (`agent.py`, `chat.py`).
- `web/` is the Vue 3 + TypeScript frontend (Vite-based).
- `test/` is reserved for backend tests (currently minimal/empty).
- `doc/`, `docker/`, and `save/` hold documentation, container assets, and generated outputs.

## Build, Test, and Development Commands
- Backend (repo root):
  - `python main.py` runs the current backend stub entrypoint.
  - `python -m pytest` runs backend tests when test files are present.
- Frontend (`web/`):
  - `npm install` installs dependencies.
  - `npm run dev` starts the Vite dev server.
  - `npm run build` runs `vue-tsc -b` then builds production assets.
  - `npm run preview` serves the built frontend locally.

## Coding Style & Naming Conventions
- Python: 4-space indentation, `snake_case` for functions/files, `PascalCase` for classes.
- TypeScript/Vue: 2-space indentation, Vue SFC components in `PascalCase` (for example `AgentComponent.vue`).
- Keep modules focused: routing logic in `server/router`, reusable domain logic in `src/`.
- Follow existing ESLint config in `web/eslint.config.js`; run lint manually when adding lint-sensitive code.

## Testing Guidelines
- Frontend currently relies on type/build validation (`npm run build`) plus manual checks.
- Backend tests should be added under `test/` as `test_*.py`.
- Prefer small, isolated tests for agent/context/config behavior before adding integration tests.

## Commit & Pull Request Guidelines
- Use Conventional Commit style, consistent with current history (`doc: ...`, `refactor: ...`, `feat: ...`, `fix: ...`).
- Keep commits atomic and scoped to one change.
- PRs should include:
  - concise summary and motivation,
  - linked issue/task ID (if available),
  - screenshots/video for UI changes under `web/`,
  - verification notes (commands run and outcomes).

## Security & Configuration Tips
- Do not commit secrets in `.env`; use `.env.template` as the reference.
- Validate model/config inputs before wiring new routes or agent execution paths.

## Agent-Specific Instructions
- First-principles reasoning is the highest-priority rule for all tasks.
- Always work in this order:
  1. Define the objective and constraints.
  2. Decompose to the minimum necessary components.
  3. Implement only the smallest correct solution.
- Responses must be concise, serious, and result-oriented. Avoid unnecessary wording.
