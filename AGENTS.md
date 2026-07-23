# OpenGPT Vue Frontend Guide

Root-level repository guidance still applies. This file narrows conventions for
the isolated Vue frontend on `web/opengpt-vue`.

## Current Phase

`web/` is a Vue 3 + TypeScript + Vite application. This branch first establishes
the OpenGPT interface and local interaction model. Authentication, thread
creation, Agent Runs, uploads, and SSE are intentionally not connected yet.

Never make an unconnected control look successful. Preview-only behavior must say
that it is local or awaiting backend integration. Do not add fake tokens, fake
users, fake conversations, fake Agent output, simulated tool calls, seeded
projects, preset prompts, or timer-driven streaming.

## Product Direction

OpenGPT is a general-purpose chat frontend with no script, storyboard, studio,
or vertical-product semantics. Reproduce the current ChatGPT web information
architecture and interaction pattern closely: compact history sidebar, model
selector, single conversation surface, and bottom composer. Replace only the
product name and brand glyph; never use ChatGPT or OpenAI trademark assets.

The visual language stays close to the current neutral ChatGPT surface:

- no decorative shadows, glass effects, or gradients;
- use spacing and surface color instead of excessive borders;
- use the neutral tokens in `src/styles/tokens.css`;
- use Inspire Mono only for utility labels and the body stack for content;
- respect visible keyboard focus and `prefers-reduced-motion`.

## Component Boundaries

Every introduced UI container with its own visual boundary, layout
responsibility, state, or interaction must be a dedicated Vue component imported
by its parent. Pages and route views assemble components; they must not contain
large sidebar, message timeline, composer, modal, account, or authentication
containers inline.

Do not split single icons or one-line text purely to increase component count.
The boundary rule applies to meaningful spaces and behaviors.

Current structure:

- `src/App.vue`: router outlet only.
- `src/router/`: Vue Router configuration and compatibility routes.
- `src/views/`: route-level assembly components.
- `src/components/layout/`: application shells and cross-page layout.
- `src/components/sidebar/`: conversation navigation regions.
- `src/components/chat/`: model selector, conversation header, timeline, notices, and composer.
- `src/components/auth/`: authentication composition and form regions.
- `src/components/dialogs/`: search and preview-information overlays.
- `src/components/ui/`: small reusable interaction primitives.
- `src/composables/`: local prototype state; future API concerns stay separate.
- `src/styles/`: global tokens and base styles only.

Use PascalCase for `.vue` components and `<script setup lang="ts">`. Use the `@`
alias for imports from `src/`.

## Local Prototype Data

Only content typed or files selected by the current user may appear as local
prototype data. Conversations saved to `localStorage` must remain clearly local.
Selected attachments must not be described as uploaded.

When real integration begins:

- place HTTP, upload, and authenticated SSE transport in `src/api/`;
- keep SSE parsing and event normalization out of visual components;
- keep transient streaming/upload state out of persistent storage;
- render model Markdown only through a sanitized dedicated component;
- use authenticated `fetch` for SSE rather than unauthenticated `EventSource`;
- do not expose internal Run or request IDs in normal UI.

## Routing

Primary routes are `/`, `/c/:conversationId`, `/login`, and `/register`.
Unrecognized legacy paths redirect to `/`; do not reintroduce the old studio
route tree into this standalone client.

Do not fake route protection before authentication is connected.

## Dependencies

The application uses Vue, Vue Router, and `@lucide/vue`. Prefer native Vue
state and CSS for the current design prototype. Do not reintroduce React,
Zustand, Ant Design, Radix React, React Router, or React motion packages.

Use CSS transitions for small UI changes. Add an animation or state dependency
only when a real interaction needs it.

## Commands and Verification

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

For visual changes, verify at least 1440×900 and 390×844. Check sidebar
collapse/drawer behavior, composer overlap, empty/local-only states, keyboard
focus, and reduced-motion behavior.

Before publishing, also verify:

```bash
git diff --check -- web AGENTS.md
rg --files web/src -g '*.tsx' -g '*.jsx'
rg -n 'react-dom|react-router-dom|zustand|lucide-react|@vitejs/plugin-react' web/src web/package.json web/vite.config.ts
rg -n 'initialScripts|initialVideoProjects|initialCommunityItems|EXAMPLE_PROMPTS' web/src
```

The last four searches should produce no offending application code.

## Commits

Follow the root `AGENTS.md`: Conventional Commit type and scope stay lowercase
English, while the subject and body use concise Chinese. Never wrap commit
messages with `@`.
