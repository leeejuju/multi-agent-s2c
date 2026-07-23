<script setup lang="ts">
defineProps<{
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
}>()

defineEmits<{
  closeMobile: []
}>()
</script>

<template>
  <div
    class="open-gpt-shell"
    :class="{ 'open-gpt-shell--collapsed': sidebarCollapsed }"
  >
    <div
      class="open-gpt-shell__sidebar"
      :class="{ 'open-gpt-shell__sidebar--mobile-open': mobileSidebarOpen }"
    >
      <slot name="sidebar" />
    </div>

    <button
      v-if="mobileSidebarOpen"
      class="open-gpt-shell__backdrop"
      type="button"
      aria-label="Close sidebar"
      @click="$emit('closeMobile')"
    />

    <main class="open-gpt-shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.open-gpt-shell {
  display: flex;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--canvas);
}

.open-gpt-shell__sidebar {
  position: relative;
  z-index: 20;
  flex: 0 0 var(--sidebar-width);
  width: var(--sidebar-width);
  min-width: 0;
  overflow: hidden;
  background: var(--sidebar);
  transition:
    flex-basis 220ms cubic-bezier(0.22, 1, 0.36, 1),
    width 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.open-gpt-shell--collapsed .open-gpt-shell__sidebar {
  flex-basis: 0;
  width: 0;
}

.open-gpt-shell__main {
  position: relative;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.open-gpt-shell__backdrop {
  display: none;
}

@media (max-width: 900px) {
  .open-gpt-shell__sidebar,
  .open-gpt-shell--collapsed .open-gpt-shell__sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: min(86vw, 304px);
    transform: translateX(-102%);
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .open-gpt-shell__sidebar--mobile-open,
  .open-gpt-shell--collapsed .open-gpt-shell__sidebar--mobile-open {
    transform: translateX(0);
  }

  .open-gpt-shell__backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    background: var(--overlay);
  }
}
</style>
