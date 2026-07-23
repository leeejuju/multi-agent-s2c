<script setup lang="ts">
import { PanelLeftClose } from "@lucide/vue";

import OpenGlyph from "@/components/brand/OpenGlyph.vue";

defineEmits<{
  (event: "close-mobile"): void;
}>();
</script>

<template>
  <header class="sidebar-header">
    <div class="sidebar-header__brand" aria-label="OpenGPT">
      <span class="sidebar-header__glyph" aria-hidden="true">
        <OpenGlyph class="sidebar-header__glyph-mark" />
      </span>
      <span class="sidebar-header__wordmark">OpenGPT</span>
    </div>

    <button
      class="sidebar-header__close"
      type="button"
      aria-label="关闭侧栏"
      @click="$emit('close-mobile')"
    >
      <PanelLeftClose :size="19" :stroke-width="1.8" aria-hidden="true" />
    </button>
  </header>
</template>

<style scoped>
.sidebar-header {
  display: flex;
  min-height: 4.25rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.875rem 0.5rem 1rem;
}

.sidebar-header__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  color: var(--ink);
}

.sidebar-header__glyph {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.625rem;
  background: var(--accent-soft);
  color: var(--accent);
}

.sidebar-header__glyph-mark {
  width: 1.35rem;
  height: 1.35rem;
}

.sidebar-header__wordmark {
  overflow: hidden;
  font-size: 1.02rem;
  font-weight: 680;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-header__close {
  display: none;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0.625rem;
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
