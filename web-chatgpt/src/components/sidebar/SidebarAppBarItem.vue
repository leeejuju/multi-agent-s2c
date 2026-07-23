<script setup lang="ts">
import type { Component } from "vue"

const props = withDefaults(
  defineProps<{
    icon: Component
    label: string
    active?: boolean
  }>(),
  {
    active: false,
  }
)

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    class="sidebar-app-bar-item"
    :class="{ 'sidebar-app-bar-item--active': props.active }"
    type="button"
    :aria-current="props.active ? 'page' : undefined"
    @click="emit('select')"
  >
    <component
      :is="props.icon"
      :size="18"
      :stroke-width="props.active ? 2 : 1.8"
      aria-hidden="true"
    />
    <span>{{ props.label }}</span>
  </button>
</template>

<style scoped>
.sidebar-app-bar-item {
  display: grid;
  width: 100%;
  min-height: 2.2rem;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.65rem;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--ink);
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  text-align: left;
}

.sidebar-app-bar-item:hover,
.sidebar-app-bar-item--active {
  background: var(--sidebar-hover);
}

.sidebar-app-bar-item--active {
  font-weight: 600;
}

.sidebar-app-bar-item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}
</style>
