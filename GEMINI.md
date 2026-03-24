# Project Overview

**multi-agent-s2c** is a full-stack application for script-driven image and video editing and generation using multiple AI agents.

## Architecture

- **Backend (Python):** Built with FastAPI and Python 3.13+. It uses LangChain for agent orchestration. The backend entry point is located in `server/main.py`, with routing logic in `server/router/` and core domain logic, agent implementations, and configurations in `src/`. Dependency management is handled by `uv`.
- **Frontend (Web):** A single-page application built with Vue 3, TypeScript, Vite, and Tailwind CSS. It is contained entirely within the `web/` directory.

# Building and Running

## Backend

The backend uses `uv` for dependencies and `uvicorn` for serving.

- **Run Server:** 
  ```bash
  python server/main.py
  ```
  *(Starts the Uvicorn dev server at `http://localhost:8000`)*
- **Run Tests:**
  ```bash
  python -m pytest
  ```

## Frontend

The frontend is a standard Node.js/Vite project.

- **Setup:**
  ```bash
  cd web
  npm install
  ```
- **Run Development Server:**
  ```bash
  npm run dev
  ```
  *(Starts the Vite dev server, typically at `http://localhost:5173`)*
- **Build for Production:**
  ```bash
  npm run build
  ```
- **Preview Production Build:**
  ```bash
  npm run preview
  ```

# Development Conventions

## Python (Backend)
- **Style:** 4-space indentation.
- **Naming:** `snake_case` for functions and files, `PascalCase` for classes.
- **Structure:** Keep modules focused. Place routing logic in `server/router/` and reusable domain/agent logic in `src/`.

## TypeScript & Vue (Frontend)
- **Style:** 2-space indentation.
- **Naming:** Vue Single File Components (SFCs) must use `PascalCase` (e.g., `AgentChatComponent.vue`).
- **Linting:** Follow the existing ESLint configuration (`web/eslint.config.js`). Run linting manually when adding sensitive code.

## Git & Commits
- **Conventional Commits:** Commit messages must follow the `<type>(<scope>): <subject>` format (e.g., `feat(agent): add stream response endpoint`).
- **Pull Requests:** PRs must include a summary, motivation, linked issue/task ID, screenshots/video for any UI changes, and verification notes containing the commands run and their outcomes.

## General Agent & Security Guidelines
- **Security:** Do not commit secrets to `.env`. Use `.env.template` as a reference. Always validate model and config inputs.
- **Implementation Strategy:** Always use first-principles reasoning. Work by defining the objective, decomposing it to the minimum necessary components, and implementing only the smallest correct solution. Keep responses concise, serious, and result-oriented.
