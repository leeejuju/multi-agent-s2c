# Vue 3 & TypeScript Mastery

<description>
Expert guidance on developing high-quality Vue 3 components utilizing the Composition API and strict TypeScript features.
</description>

<instructions>
When generating or modifying Vue 3 code in this workspace, you MUST adhere to the following principles:

## Composition API & `<script setup>`
1. **Always use `<script setup lang="ts">`** for new Single File Components (SFCs).
2. **Reactivity:** Use `ref` for primitive values and `reactive` for deeply nested objects.
3. **Composables:** Extract stateful business logic into composable functions (`useFeature.ts`) located in the `src/composables` or `src/hooks` directory. Keep components focused on UI logic.

## TypeScript Standards
1. **Prop and Emit Typing:** Always use `defineProps<{ ... }>()` and `defineEmits<{ ... }>()` to strictly type component inputs and outputs.
2. **Type Safety:** Avoid `any`. Use `unknown` and type guards if necessary.
3. **Template Refs:** Type template refs precisely (e.g., `const modalRef = ref<HTMLDialogElement | null>(null)`).

## Component Design
1. **Single Responsibility:** Components should do one thing well. Break down large components.
2. **Slots over Props for Markup:** Use Vue's `<slot>` system to pass layout or complex markup instead of passing HTML strings via props.
3. **Cohesion & Coupling:** Strive for high cohesion within components and loose coupling between them.
</instructions>
