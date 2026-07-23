<script setup lang="ts">
import { Layers } from "@lucide/vue"

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
    view-id="static"
    title="Static"
    headline="Static is not connected"
    description="Static content will be available here after the backend is connected."
    :icon="Layers"
    :sidebar-collapsed="props.sidebarCollapsed"
    @toggle-sidebar="emit('toggle-sidebar')"
  />
</template>
