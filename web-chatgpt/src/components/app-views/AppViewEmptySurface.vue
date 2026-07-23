<script setup lang="ts">
import type { Component } from "vue"

import AppViewHeader from "./AppViewHeader.vue"

const props = defineProps<{
  viewId: string
  title: string
  headline: string
  description: string
  icon: Component
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  "toggle-sidebar": []
}>()
</script>

<template>
  <main class="app-view-empty-surface" :aria-label="props.title">
    <AppViewHeader
      :title="props.title"
      :sidebar-collapsed="props.sidebarCollapsed"
      @toggle-sidebar="emit('toggle-sidebar')"
    />

    <div class="app-view-empty-surface__stage">
      <section
        class="app-view-empty-surface__content"
        :aria-labelledby="`${props.viewId}-empty-heading`"
      >
        <component
          :is="props.icon"
          class="app-view-empty-surface__icon"
          :size="44"
          :stroke-width="1.35"
          aria-hidden="true"
        />
        <p class="app-view-empty-surface__status">
          <span aria-hidden="true" />
          Backend not connected
        </p>
        <h2 :id="`${props.viewId}-empty-heading`">
          {{ props.headline }}
        </h2>
        <p class="app-view-empty-surface__description">
          {{ props.description }}
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.app-view-empty-surface {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100dvh;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  color: var(--ink);
  background: var(--canvas);
}

.app-view-empty-surface__stage {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 1.5rem clamp(1rem, 5vw, 3rem) 5.5rem;
}

.app-view-empty-surface__content {
  display: flex;
  width: min(100%, 480px);
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.app-view-empty-surface__icon {
  margin-bottom: 1.1rem;
  color: var(--ink);
}

.app-view-empty-surface__status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.85rem;
  color: var(--faint);
  font-family: var(--font-utility);
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app-view-empty-surface__status span {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--faint);
}

.app-view-empty-surface h2 {
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2rem);
  font-weight: 550;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.app-view-empty-surface__description {
  max-width: 430px;
  margin: 0.75rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

@media (max-width: 560px) {
  .app-view-empty-surface__stage {
    align-items: flex-start;
    padding: 23vh 1.25rem 3rem;
  }
}
</style>
