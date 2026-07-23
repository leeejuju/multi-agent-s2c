<script setup lang="ts">
import { ref } from "vue"

import AppToggle from "@/components/ui/AppToggle.vue"

const improveModel = ref(false)
const saveLocalHistory = ref(true)
</script>

<template>
  <section class="settings-panel" aria-labelledby="settings-data-title">
    <h3 id="settings-data-title" class="settings-panel__title">Data Controls</h3>

    <div class="settings-list">
      <div class="settings-item">
        <span class="settings-item__label">Save local chat history</span>
        <AppToggle v-model="saveLocalHistory" label="Save local chat history" />
      </div>

      <div class="settings-item">
        <span class="settings-item__label">Improve the model</span>
        <AppToggle v-model="improveModel" label="Improve the model" />
      </div>

      <div class="settings-item">
        <span class="settings-item__label">Storage location</span>
        <span class="settings-item__value">Local device</span>
      </div>
    </div>
  </section>
</template>
