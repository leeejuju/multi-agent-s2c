# Project Overview

**multi-agent-s2c (Frontend)** is the web interface for a script-driven image and video editing and generation application. 

## Architecture

- **Frontend (Web):** A single-page application built with Vue 3, TypeScript, Vite, and Tailwind CSS. It is contained entirely within the `web/` directory.

# Building and Running

The frontend is a standard Node.js/Vite project.

- **Setup:**
  ```bash
  cd web
  npm install
  ```
- **Run Development Server:**
  ```bash
  cd web
  npm run dev
  ```
  *(Starts the Vite dev server, typically at `http://localhost:5173`)*
- **Build for Production:**
  ```bash
  cd web
  npm run build
  ```
- **Preview Production Build:**
  ```bash
  cd web
  npm run preview
  ```

# Development Conventions

## TypeScript & Vue
- **Style:** 2-space indentation.
- **Naming:** Vue Single File Components (SFCs) must use `PascalCase` (e.g., `AgentChatComponent.vue`).
- **Linting:** Follow the existing ESLint configuration (`web/eslint.config.js`). Run linting manually when adding sensitive code.

## Git & Commits
- **Conventional Commits:** Commit messages must follow the `<type>(<scope>): <subject>` format (e.g., `feat(web): add chat interface`).
- **Pull Requests:** PRs must include a summary, motivation, linked issue/task ID, screenshots/video for any UI changes, and verification notes containing the commands run and their outcomes.

## General Agent Guidelines
- **Implementation Strategy:** Always use first-principles reasoning. Work by defining the objective, decomposing it to the minimum necessary components, and implementing only the smallest correct solution. Keep responses concise, serious, and result-oriented.
