<script setup lang="ts">
import { Library } from "@lucide/vue"

import AppViewEmptySurface from "./AppViewEmptySurface.vue"

const props = defineProps<{
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  "toggle-sidebar": []
}>()
</script>

<template>
  <AppViewEmptySurface
    view-id="library"
    title="Library"
    headline="Nothing saved yet"
    description="Saved content will appear here after Library data is connected."
    :icon="Library"
    :sidebar-collapsed="props.sidebarCollapsed"
    @toggle-sidebar="emit('toggle-sidebar')"
  />
</template>
