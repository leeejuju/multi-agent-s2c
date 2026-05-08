# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React application code.
- `src/components/` holds reusable TSX UI modules, named in PascalCase.
- `src/pages/` holds route-level screens such as `HomeView.tsx`.
- `src/api/` contains framework-agnostic API client logic.
- `src/assets/css/main.css` contains Tailwind entrypoint and shared app styles.
- Root config files include `vite.config.ts`, `tsconfig.json`, and `eslint.config.js`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Vite dev server with hot reload.
- `npm run build`: run TypeScript checks and create a production build.
- `npm run preview`: serve the built app locally for verification.
- `npx eslint .`: run lint checks.

## Coding Style & Naming Conventions
- Use React, TypeScript, and TSX.
- Indentation: 2 spaces; keep imports grouped logically.
- Component files use PascalCase, for example `MessageInput.tsx`.
- API/util modules use lower-case file names where established, for example `agent.ts`.
- Prefer local component state and hooks unless shared state becomes necessary.

## Testing Guidelines
- No automated test framework is currently configured.
- Validate changes with `npm run build` and manual browser checks.
- If adding tests, prefer Vitest + React Testing Library and colocate as `*.spec.tsx`.

## Commit & Pull Request Guidelines
- Use Conventional Commits going forward, for example `feat(web): migrate to react`.
- Keep commits focused and atomic.
- PRs should include a behavior summary, screenshots or recordings for UI changes, and verification notes.

## Security & Configuration Tips
- Keep environment-specific values in `.env.*` files and never commit secrets.
- Validate outbound API URLs and request payloads in `src/api/` before release.
