<script setup lang="ts">
import { SquareTerminal } from "@lucide/vue"

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
    view-id="sandbox"
    title="Sandbox"
    headline="Sandbox is not connected"
    description="Sandbox sessions will appear here after runtime services are connected."
    :icon="SquareTerminal"
    :sidebar-collapsed="props.sidebarCollapsed"
    @toggle-sidebar="emit('toggle-sidebar')"
  />
</template>
