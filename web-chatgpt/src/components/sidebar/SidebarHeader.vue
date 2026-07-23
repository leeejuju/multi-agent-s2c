<script setup lang="ts">
import { PanelLeftClose } from "@lucide/vue"

import OpenGlyph from "@/components/brand/OpenGlyph.vue"

defineEmits<{
  (event: "close-mobile"): void
}>()
</script>

<template>
  <header class="sidebar-header">
    <div class="sidebar-header__brand" aria-label="OpenGPT">
      <OpenGlyph class="sidebar-header__glyph" aria-hidden="true" />
      <span class="sidebar-header__wordmark">OpenGPT</span>
    </div>

    <button
      class="sidebar-header__close"
      type="button"
      aria-label="Close sidebar"
      @click="$emit('close-mobile')"
    >
      <PanelLeftClose :size="18" :stroke-width="1.8" aria-hidden="true" />
    </button>
  </header>
</template>

<style scoped>
.sidebar-header {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 0.85rem 0.35rem 1rem;
}

.sidebar-header__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink);
}

.sidebar-header__glyph {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  color: var(--ink);
}

.sidebar-header__wordmark {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-header__close {
  display: none;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.sidebar-header__close:hover {
  background: var(--sidebar-hover);
  color: var(--ink);
}

.sidebar-header__close:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .sidebar-header__close {
    display: inline-flex;
  }
}
</style>
