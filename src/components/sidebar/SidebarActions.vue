<script setup lang="ts">
import { Image, Search, SquarePen } from "@lucide/vue";

defineEmits<{
  (event: "new-conversation"): void;
  (event: "search"): void;
}>();
</script>

<template>
  <nav class="sidebar-actions" aria-label="主要导航">
    <button
      class="sidebar-actions__item"
      type="button"
      @click="$emit('new-conversation')"
    >
      <SquarePen :size="18" :stroke-width="1.9" aria-hidden="true" />
      <span>新建聊天</span>
    </button>

    <button
      class="sidebar-actions__item"
      type="button"
      @click="$emit('search')"
    >
      <Search :size="18" :stroke-width="1.9" aria-hidden="true" />
      <span>搜索聊天</span>
    </button>

    <button
      class="sidebar-actions__item"
      type="button"
      disabled
      title="将在功能接入阶段开放"
    >
      <Image :size="18" :stroke-width="1.9" aria-hidden="true" />
      <span>图片</span>
      <small>稍后</small>
    </button>
  </nav>
</template>

<style scoped>
.sidebar-actions {
  display: grid;
  gap: 2px;
  padding: 0.25rem 0.5rem 0.8rem;
}

.sidebar-actions__item {
  display: grid;
  width: 100%;
  min-height: 2.5rem;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.65rem;
  border: 0;
  border-radius: 0.7rem;
  color: var(--ink);
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.sidebar-actions__item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.sidebar-actions__item:hover:not(:disabled) {
  background: var(--sidebar-hover);
  color: var(--ink);
}

.sidebar-actions__item:disabled {
  cursor: default;
  opacity: 0.58;
}

.sidebar-actions__item small {
  color: var(--muted);
  font-size: 10px;
  font-weight: 500;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-actions__item {
    transition: none;
  }
}
</style>
