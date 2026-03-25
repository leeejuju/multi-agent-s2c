# Tailwind CSS UI & UX Design

<description>
Guidelines for creating consistent, beautiful, and accessible user interfaces using Tailwind CSS.
</description>

<instructions>
When styling components or designing new UIs, adhere to these Tailwind CSS principles:

## Core Styling Principles
1. **Utility-First:** Prioritize using Tailwind utility classes directly in the template over writing custom CSS in `<style>` blocks.
2. **Design Tokens:** Stick strictly to the project's configured Tailwind color palette, spacing scale, and typography variables. Do not use arbitrary values (e.g., `bg-[#123456]`) unless absolutely necessary for a one-off brand requirement.

## Layout and Spacing
1. **Consistency:** Use the default Tailwind spacing scale (`p-4`, `m-2`, `gap-4`) to maintain consistent rhythm and alignment across the application.
2. **Flex & Grid:** Use Flexbox for one-dimensional layouts (alignment, distribution) and CSS Grid for complex, two-dimensional layouts.

## Interaction and State
1. **Interactive States:** Always provide visual feedback for interactive elements. Apply `hover:`, `focus:`, `active:`, and `disabled:` variants (e.g., `hover:bg-blue-600 focus:ring-2 disabled:opacity-50`).
2. **Transitions:** Use `transition` and `duration-*` classes to smoothly animate state changes (e.g., `transition-colors duration-200`).

## Component Abstraction
1. **Extraction:** If a complex set of utilities is heavily repeated (like a standard primary button), extract it into a reusable Vue component (e.g., `<BaseButton>`) rather than relying on `@apply` in global CSS. This keeps styles co-located with the template logic.
</instructions>
