<script setup lang="ts">
import { Bot } from "@lucide/vue"

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
    view-id="agent"
    title="Agent"
    headline="Agent setup is not connected"
    description="Agent configuration will be available here after the backend is connected."
    :icon="Bot"
    :sidebar-collapsed="props.sidebarCollapsed"
    @toggle-sidebar="emit('toggle-sidebar')"
  />
</template>
