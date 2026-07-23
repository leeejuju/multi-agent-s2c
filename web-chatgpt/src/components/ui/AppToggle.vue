<script setup lang="ts">
const checked = defineModel<boolean>({ default: false })

defineProps<{
  label: string
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="app-toggle"
    type="button"
    role="switch"
    :aria-checked="checked"
    :aria-label="label"
    :disabled="disabled"
    @click="checked = !checked"
  >
    <span class="app-toggle__thumb" aria-hidden="true" />
  </button>
</template>

<style scoped>
.app-toggle {
  position: relative;
  width: 40px;
  height: 24px;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--surface-strong);
  cursor: pointer;
}

.app-toggle[aria-checked="true"] {
  background: var(--ink);
}

.app-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.app-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface);
  transition: transform 140ms ease;
}

.app-toggle[aria-checked="true"] .app-toggle__thumb {
  transform: translateX(16px);
}

.app-toggle:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .app-toggle__thumb {
    transition: none;
  }
}
</style>
