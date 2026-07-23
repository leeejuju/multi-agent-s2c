<script setup lang="ts">
import { LogIn, Settings } from "@lucide/vue"
import { RouterLink } from "vue-router"

defineEmits<{
  (event: "open-settings"): void
}>()
</script>

<template>
  <footer class="sidebar-footer">
    <RouterLink class="sidebar-footer__item" to="/login">
      <LogIn :size="17" :stroke-width="1.8" aria-hidden="true" />
      <span>Log in</span>
    </RouterLink>

    <button
      class="sidebar-footer__item"
      type="button"
      @click="$emit('open-settings')"
    >
      <Settings :size="17" :stroke-width="1.8" aria-hidden="true" />
      <span>Settings</span>
    </button>
  </footer>
</template>

<style scoped>
.sidebar-footer {
  display: grid;
  gap: 1px;
  padding: 0.35rem 0.4rem 0.75rem;
}

.sidebar-footer__item {
  display: flex;
  width: 100%;
  min-height: 2.2rem;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.65rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.84rem;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
}

.sidebar-footer__item:hover {
  background: var(--sidebar-hover);
  color: var(--ink);
}

.sidebar-footer__item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
