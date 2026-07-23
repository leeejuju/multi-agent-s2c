<script setup lang="ts">
import type { SettingsSectionId } from "@/types/settings"

import AboutSettingsPanel from "./panels/AboutSettingsPanel.vue"
import AccountSettingsPanel from "./panels/AccountSettingsPanel.vue"
import DataSettingsPanel from "./panels/DataSettingsPanel.vue"
import GeneralSettingsPanel from "./panels/GeneralSettingsPanel.vue"

defineProps<{
  activeSection: SettingsSectionId
}>()
</script>

<template>
  <div class="settings-workspace" aria-live="polite">
    <GeneralSettingsPanel v-if="activeSection === 'general'" />
    <AccountSettingsPanel v-else-if="activeSection === 'account'" />
    <DataSettingsPanel v-else-if="activeSection === 'data'" />
    <AboutSettingsPanel v-else />
  </div>
</template>

<style>
.settings-panel {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}

.settings-panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.settings-list {
  display: grid;
  min-width: 0;
  gap: 0;
}

.settings-item {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: 0.9rem;
}

.settings-item__label {
  min-width: 0;
  font-weight: 400;
}

.settings-item__value {
  color: var(--muted);
  text-align: right;
}

.settings-item__link {
  color: var(--ink);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.settings-select {
  max-width: 48%;
  min-width: 7rem;
  height: 32px;
  padding: 0 1.5rem 0 0;
  border: 0;
  border-radius: 0;
  background:
    transparent
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 2px center;
  color: var(--muted);
  font: inherit;
  font-size: 0.9rem;
  text-align: right;
  appearance: none;
  cursor: pointer;
}

.settings-select:hover,
.settings-select:focus {
  color: var(--ink);
}

.settings-select:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}
</style>

<style scoped>
.settings-workspace {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
  padding: 1.25rem 1.75rem 1.75rem;
  background: var(--surface);
}

@media (max-width: 720px) {
  .settings-workspace {
    padding: 1rem 1.1rem 1.4rem;
  }
}
</style>
