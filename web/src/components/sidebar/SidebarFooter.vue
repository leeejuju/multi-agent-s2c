<script setup lang="ts">
import { LogIn, Settings } from "@lucide/vue";
import { RouterLink } from "vue-router";

defineEmits<{
  (event: "open-settings"): void;
}>();
</script>

<template>
  <footer class="sidebar-footer">
    <RouterLink class="sidebar-footer__login" to="/login">
      <LogIn :size="18" :stroke-width="1.8" aria-hidden="true" />
      <span>登录</span>
    </RouterLink>

    <button
      class="sidebar-footer__settings"
      type="button"
      @click="$emit('open-settings')"
    >
      <Settings :size="18" :stroke-width="1.8" aria-hidden="true" />
      <span>设置</span>
    </button>
  </footer>
</template>

<style scoped>
.sidebar-footer {
  padding: 0.5rem 0.75rem 0.75rem;
}

.sidebar-footer__settings,
.sidebar-footer__login {
  display: flex;
  width: 100%;
  min-height: 2.55rem;
  align-items: center;
  gap: 0.625rem;
  padding: 0 0.75rem;
  border: 0;
  border-radius: 0.7rem;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.84rem;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.sidebar-footer__settings:hover,
.sidebar-footer__login:hover {
  background: var(--sidebar-hover);
  color: var(--ink);
}

.sidebar-footer__settings:focus-visible,
.sidebar-footer__login:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-footer__settings {
    transition: none;
  }
}
</style>
