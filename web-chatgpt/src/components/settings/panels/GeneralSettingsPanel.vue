<script setup lang="ts">
import { ref } from "vue"

import AppSelect from "@/components/ui/AppSelect.vue"
import AppToggle from "@/components/ui/AppToggle.vue"

const theme = ref("light")
const language = ref("en")
const showFollowUps = ref(true)

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" }
]

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" }
]
</script>

<template>
  <section class="settings-panel" aria-labelledby="settings-general-title">
    <h3 id="settings-general-title" class="settings-panel__title">General</h3>

    <div class="settings-list">
      <div class="settings-item">
        <span class="settings-item__label">Theme</span>
        <AppSelect
          v-model="theme"
          :options="themeOptions"
          aria-label="Theme"
        />
      </div>

      <div class="settings-item">
        <span class="settings-item__label">Language</span>
        <AppSelect
          v-model="language"
          :options="languageOptions"
          aria-label="Language"
        />
      </div>

      <div class="settings-item">
        <span class="settings-item__label">Show follow-up suggestions</span>
        <AppToggle v-model="showFollowUps" label="Show follow-up suggestions" />
      </div>
    </div>
  </section>
</template>
