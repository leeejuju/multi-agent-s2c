# OpenGPT Web

This branch contains the Vue 3 design prototype for the OpenGPT conversation
experience. It is intentionally isolated from the existing React frontend.

The current phase focuses on the interface and local interactions. Authentication,
thread creation, Agent Runs, uploads, and SSE are not connected yet. The UI never
simulates model output or seeded conversations.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

The Vite dev server keeps the `/api` proxy ready for the next integration phase.
