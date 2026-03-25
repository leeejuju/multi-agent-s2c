# Frontend Architecture & State Management

<description>
Best practices for structuring the frontend application and managing global state effectively.
</description>

<instructions>
Follow these architectural guidelines when building or extending the frontend:

## Directory Structure
Maintain a clear and predictable structure within the `web/src` directory:
- `components/`: Reusable, generic UI components (buttons, inputs, cards).
- `views/` or `pages/`: Route-level components that compose generic components to form full screens.
- `composables/`: Reusable Vue composition functions containing business logic.
- `api/`: API service modules for backend communication (fetch/axios wrappers).
- `store/`: Global state management definitions (Pinia or Vuex).
- `assets/`: Static assets like images, icons, and global CSS.

## State Management
1. **Local vs. Global State:** Prefer local component state (`ref`, `reactive`) for UI-specific data. Only elevate state to a global store when it is shared across multiple unrelated components or represents the core domain model of the application.
2. **Pinia:** If global state is needed, assume Pinia is the standard for Vue 3. Keep stores modular (e.g., `useUserStore`, `useAgentStore`).
3. **Data Fetching:** Isolate API calls into the `api/` directory. Components should call these API methods (or actions in a store that call them) rather than making `fetch` calls directly within the component script.

## Performance
1. **Lazy Loading:** Use Vue Router's dynamic imports to lazy-load route components (`component: () => import('./views/Home.vue')`).
2. **Vite Optimization:** Leverage Vite's native features. Avoid heavy monolithic bundles by keeping dependencies clean and utilizing modern ES modules.
</instructions>
