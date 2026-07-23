<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    active?: boolean
    disabled?: boolean
    type?: "button" | "submit"
  }>(),
  {
    active: false,
    disabled: false,
    type: "button"
  }
)
</script>

<template>
  <button
    class="icon-button"
    :class="{ 'icon-button--active': active }"
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-grid;
  width: 36px;
  height: 36px;
  padding: 0;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--muted);
  background: transparent;
}

.icon-button:hover:not(:disabled),
.icon-button--active {
  color: var(--ink);
  background: var(--surface-muted);
}

.icon-button:disabled {
  opacity: 0.38;
}
</style>
