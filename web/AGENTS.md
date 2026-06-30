# Frontend Agent Guide

This file contains frontend-specific guidance for coding agents working in `web/`.
Root-level repository guidance still applies; this file only narrows conventions for
the React client.

## Current Frontend Shape

The web client is a React 19 + TypeScript + Vite 7 application. It uses Ant Design
6 for common UI primitives, Tailwind CSS 4 through the Vite plugin, Zustand 5 for
client state, and `react-router-dom` 7 for routing.

The current UI also uses `motion/react` for component-level motion, GSAP for the
auth landing choreography, `lucide-react` for action icons, and
`markdown-it`/DOMPurify/Shiki/KaTeX for assistant markdown rendering.

The Vite dev server proxies `/api` requests to `http://localhost:5050`. In
production-style code, API calls should continue to use `VITE_API_BASE_URL` when
provided and fall back to `/api`.

## Project Structure

- `src/App.tsx` owns router setup, route guards, and Ant Design theme tokens.
- `src/main.tsx` mounts the React app and imports global styles.
- `src/pages/` contains route-level screens, currently `AppView.tsx`,
  `LoginView.tsx`, and `RegisterView.tsx`. Do not place CSS files in this
  directory.
- `src/components/` contains reusable UI modules. Most component folders keep
  `ComponentName.tsx`, `ComponentName.css`, and `index.ts` together.
- `src/components/*/component/` contains component-local submodules where that
  pattern is already established.
- `src/api/` contains framework-agnostic API client logic. Keep request,
  upload, and streaming transport concerns here instead of embedding them in UI
  components.
- `src/store/` contains Zustand stores for shared client state.
- `src/hooks/` contains reusable React hooks.
- `src/assets/css/Global.css` contains the Tailwind entrypoint, font-face
  declarations, and global base styles.
- `src/assets/animations/` and `src/assets/icon/` contain animation helpers and
  static visual assets.
- `src/assets/landing/` contains auth landing visual assets.

Use the `@` alias for imports from `src/`.

## Routing, Auth, and API Rules

- Keep protected route behavior in `App.tsx` aligned with `RequireAuth` and
  `RedirectIfAuthenticated`.
- The authenticated app shell currently lives under `/app/:sectionId`, with `/`
  and `/app` redirecting to `/app/script`.
- Login and registration routes are `/login` and `/register`.
- Do not bypass `useAuthStore` for token handling. API helpers in `src/api/`
  attach `Authorization` and clear auth on `401`.
- Use the shared helpers from `src/api/index.ts` (`get`, `post`, `put`, `del`,
  `postForm`, `requestStream`, `requestRunStream`) for backend calls.
- Keep streaming JSON-line parsing and tool-event normalization inside the API
  layer or a dedicated hook, not inside presentational components.
- Treat attachment upload progress and abort behavior as transport concerns first;
  expose clean UI state to components.

## State Management

- Prefer local component state for UI-only details.
- Use Zustand stores in `src/store/` for shared state across pages, chat sessions,
  authentication, or workspace-level behavior.
- Persist only serializable, durable state. Strip transient state such as
  `streaming`, active uploads, temporary errors, and in-flight progress before
  storage.
- Keep state update helpers typed and narrowly scoped; avoid broad global stores
  for unrelated UI concerns.

## UI and Styling Conventions

- Follow existing Ant Design theme tokens in `App.tsx` before introducing new
  color, radius, typography, or control-height conventions.
- Prefer Ant Design controls for standard inputs, forms, menus, drawers, buttons,
  and feedback states unless an existing custom component is already the local
  pattern.
- Prefer `lucide-react` icons for common action icons.
- Prefer Tailwind utility classes for page layout and new UI work. Avoid adding
  new page-level CSS files; keep `src/pages/` free of CSS.
- Tailwind CSS is available, but do not rewrite established CSS-module-style files
  into utility-only markup unless the change is already scoped to that component.
- Use `motion/react` for React component enter/exit, panel, drawer, and canvas
  item motion when following the existing component pattern.
- Keep reusable motion configuration in `src/assets/animations/` when it is shared
  across a component surface.
- Maintain the existing studio/workspace product feel: dense, practical,
  responsive interfaces over marketing-style sections.
- Use stable dimensions for toolbars, canvas items, panels, buttons, and dynamic
  message content so loading states and streaming text do not shift the layout.
- Check mobile and desktop widths for text overflow, overlapping panels, and
  unreadable controls when changing layout.

## Markdown and Generated Content

- Render assistant/model markdown through `src/components/MarkdownRenderer/`.
- Preserve the `markdown-it` parser, DOMPurify sanitization, KaTeX math rendering,
  Shiki code highlighting, and streaming-safe fence/math normalization boundaries
  unless the change is explicitly about replacing that renderer.
- Keep raw HTML disabled in markdown parsing. Do not insert model-provided HTML
  with `dangerouslySetInnerHTML` outside the sanitized renderer boundary.
- Keep assistant chat rendering wired through `AgentChat` message components
  instead of adding a parallel rendering path.

## WebGL / Three.js Strategy

Do not use WebGL for normal UI animation.

Use WebGL only when the task requires real-time GPU-rendered graphics, 3D scenes, shader effects, particles, simulations, or interactive canvas-based visuals.

Default choice:

* Use CSS for simple UI transitions.
* Use GSAP for complex DOM/SVG animation, timeline choreography, and scroll-driven animation.
* Use Three.js or React Three Fiber when the feature requires WebGL-based rendering.
* Avoid writing raw WebGL unless the user explicitly asks for low-level shader or WebGL code.

Use WebGL / Three.js when the request includes:

* 3D models, 3D product viewers, camera movement, lights, materials, or scene composition.
* Particle systems, star fields, smoke, fire, water, fluid-like effects, noise fields, or GPU-heavy visuals.
* Shader effects such as distortion, refraction, bloom-like glow, scanlines, glitch, displacement, or custom fragment/vertex shader work.
* Interactive 3D experiences, mini-games, virtual showrooms, maps, simulations, or canvas-based visual editors.
* Large numbers of animated objects that would be inefficient as DOM nodes.

Avoid WebGL when:

* The animation is a simple hover, fade, slide, scale, accordion, modal, tooltip, navbar, or card effect.
* GSAP or CSS can achieve the effect cleanly.
* The page is mostly content/UI and the 3D effect is only decorative.
* Mobile performance, bundle size, accessibility, or loading time would suffer without strong product value.

React / Next.js rules:

* For React projects, prefer `@react-three/fiber` over imperative Three.js when building a React-based 3D scene.
* Keep WebGL components isolated from normal UI components.
* In Next.js App Router, put Three.js / R3F code inside client components.
* Lazy-load heavy 3D scenes where possible.
* Provide loading states and fallbacks.
* Do not block the main page content while large 3D assets load.

Performance rules:

* Optimize models, textures, geometry count, draw calls, and material complexity.
* Avoid unnecessary post-processing.
* Pause or reduce rendering when the canvas is offscreen.
* Respect device capability and provide lower-quality fallbacks on weak devices.
* Do not use WebGL for purely decorative effects if CSS/GSAP is sufficient.

Accessibility rules:

* Respect `prefers-reduced-motion`.
* Avoid intense camera movement, flashing, rapid particles, and aggressive parallax.
* Ensure core content and navigation do not depend on WebGL.
* Provide fallback content when WebGL is unavailable.

## Animation Strategy / Motion And GSAP

Do not use GSAP or heavy motion libraries by default for every animation.

Default rule:

* Prefer CSS transitions / CSS keyframes / Tailwind animation utilities for simple UI animations.
* Use `motion/react` when React component state drives enter/exit, layout, drawer,
  panel, or canvas-item animation and the existing local pattern already uses it.
* Use GSAP only when animation complexity justifies it, or when extending the
  existing `AuthLanding` choreography.

Use GSAP when the task involves one or more of the following:

* Multi-step timeline choreography across multiple elements.
* Scroll-driven animation, ScrollTrigger, scrub, pin, snap, parallax, or section-based storytelling.
* Complex hero animations or landing-page motion design.
* SVG animation, path animation, text splitting, morphing, draggable/inertia, Flip transitions, or advanced plugin usage.
* Precise imperative control: play, pause, reverse, seek, timeline labels, timeScale, restart.
* Framework-agnostic animation that needs to work outside React state-driven animation patterns.
* Existing project already uses GSAP and the change must follow that style.

Avoid GSAP when:

* The animation is a simple hover, focus, opacity, transform, dropdown, modal, tooltip, or button transition.
* `motion/react` already covers the component-level interaction cleanly.
* CSS can express the animation clearly with less code.
* The project already uses another animation library and the requested change fits that library.
* The animation would add unnecessary dependency, complexity, or accessibility risk.

React / Next.js rules:

* For React components, use `@gsap/react` and `useGSAP()` instead of raw `useEffect()` when writing GSAP code.
* Scope selectors with a container ref.
* Register required GSAP plugins explicitly.
* In Next.js App Router, keep GSAP usage inside client components.
* Clean up animations properly; avoid leaking ScrollTriggers, timelines, or event listeners.

Accessibility rules:

* Always respect `prefers-reduced-motion`.
* For reduced motion, remove decorative motion or simplify it to opacity-only / minimal movement.
* Avoid large fast swipes, aggressive parallax, flashing, or excessive infinite motion unless there is a clear reason.

Performance rules:

* Prefer animating `transform` and `opacity`.
* Avoid layout-heavy animation of `width`, `height`, `top`, `left`, or frequent DOM measurement unless necessary.
* Do not introduce ScrollTrigger or heavy plugins for tiny micro-interactions.
* Keep animation code isolated and readable.

## Code Style

- Use React, TypeScript, and TSX.
- Indent with 2 spaces.
- Component files use PascalCase, for example `MessageInput.tsx`.
- API, hook, and store modules use the naming style already present in their
  folder, usually lower-case file names such as `agent.ts` or `chat.ts`.
- Keep imports grouped logically: external libraries first, then `@/` imports,
  then relative imports.
- Prefer typed props and exported domain types near the component, hook, API, or
  store that owns them.
- Avoid adding new abstractions until at least two real call sites need them or an
  existing local pattern already exists.

## Build, Test, and Development Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npx eslint .
```

`npm run build` runs TypeScript project checks with `tsc -b` and then creates the
Vite production build.

## Testing and Verification

- No automated test framework is currently configured.
- Do not run `npm run build` after every code change by default; the user will
  validate frontend behavior manually.
- Run `npx eslint .` when touching broad TypeScript or React code.
- For UI changes, manually verify the affected route in a browser at desktop and
  mobile widths. Include screenshots or recordings in PRs when visual behavior
  changes.
- If adding tests, prefer Vitest + React Testing Library and colocate tests as
  `*.spec.tsx` beside the component or hook under test.

## Security and Configuration

- Keep secrets out of the repository. Use `.env.*` files for local configuration.
- Only expose client-safe values through `VITE_*` environment variables.
- Sanitize or safely render model/user-provided markdown and HTML; preserve the
  existing markdown rendering boundary instead of inserting raw HTML directly.
- Validate API payloads and file metadata before sending them to the backend.

## Commit and PR Guidance

- Use English commit messages and do not wrap them in `@` characters.
- Prefer Conventional Commit style for frontend work, for example
  `feat(web): add workspace drawer`.
- Keep commits focused.
- PR descriptions should include a behavior summary, visual evidence for UI
  changes, and verification notes.
