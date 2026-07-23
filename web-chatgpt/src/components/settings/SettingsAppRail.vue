<script setup lang="ts">
import type { SettingsSection, SettingsSectionId } from "@/types/settings"

import { SETTINGS_SECTIONS } from "./settingsNav"

defineProps<{
  activeSection: SettingsSectionId
}>()

const emit = defineEmits<{
  select: [sectionId: SettingsSectionId]
}>()

const sections: SettingsSection[] = SETTINGS_SECTIONS
</script>

<template>
  <nav class="settings-rail" aria-label="Settings navigation">
    <button
      v-for="section in sections"
      :key="section.id"
      class="settings-rail__item"
      type="button"
      :class="{ 'settings-rail__item--active': activeSection === section.id }"
      :aria-current="activeSection === section.id ? 'page' : undefined"
      @click="emit('select', section.id)"
    >
      <component
        :is="section.icon"
        class="settings-rail__icon"
        :size="18"
        :stroke-width="activeSection === section.id ? 2 : 1.7"
        aria-hidden="true"
      />
      <span>{{ section.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.settings-rail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  height: 100%;
  padding: 0.65rem 0.75rem;
  overflow: auto;
  background: transparent;
}

.settings-rail__item {
  display: flex;
  width: 100%;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.65rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 450;
  text-align: left;
  cursor: pointer;
}

.settings-rail__icon {
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: inherit;
}

.settings-rail__item:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.settings-rail__item--active {
  color: var(--ink);
  font-weight: 600;
  background: transparent;
}

.settings-rail__item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .settings-rail {
    flex-direction: row;
    gap: 0.15rem;
    width: 100%;
    height: auto;
    padding: 0.65rem 0.85rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .settings-rail::-webkit-scrollbar {
    display: none;
  }

  .settings-rail__item {
    flex: 0 0 auto;
    min-height: 2rem;
    padding: 0 0.65rem;
    white-space: nowrap;
  }
}
</style>
