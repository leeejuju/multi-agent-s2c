# Project Overview

**multi-agent-s2c (Frontend)** is the web interface for a script-driven image and video editing and generation application.

## Architecture

- **Frontend (Web):** A single-page application built with React, TypeScript, Vite, and Tailwind CSS. It is contained entirely within the `web/` directory.
- **Routing:** `react-router-dom` owns browser routes and auth redirects.
- **API Client:** `web/src/api/` contains framework-agnostic fetch and SSE helpers used by the React UI.

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
  Starts the Vite dev server, typically at `http://localhost:5173`.
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

## TypeScript & React
- **Style:** 2-space indentation.
- **Naming:** React component files use `PascalCase` and `.tsx`.
- **State:** Prefer local hooks and small typed helpers before adding global state.
- **Linting:** Follow `web/eslint.config.js`. Run linting manually when adding sensitive code.

## Git & Commits
- **Conventional Commits:** Commit messages must follow the `<type>(<scope>): <subject>` format, for example `feat(web): add chat interface`.
- **Pull Requests:** PRs must include a summary, motivation, linked issue/task ID, screenshots/video for UI changes, and verification notes containing the commands run and outcomes.

## General Agent Guidelines
- **Implementation Strategy:** Define the objective, decompose it to the minimum necessary components, and implement the smallest correct solution. Keep responses concise, serious, and result-oriented.
