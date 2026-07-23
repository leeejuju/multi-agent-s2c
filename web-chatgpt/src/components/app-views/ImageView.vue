<script setup lang="ts">
import { Image as ImageIcon } from "@lucide/vue"

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
    view-id="image"
    title="Image"
    headline="No images yet"
    description="Generated images will appear here after image generation is connected."
    :icon="ImageIcon"
    :sidebar-collapsed="props.sidebarCollapsed"
    @toggle-sidebar="emit('toggle-sidebar')"
  />
</template>
