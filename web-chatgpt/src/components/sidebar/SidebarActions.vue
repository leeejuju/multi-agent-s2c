<script setup lang="ts">
import {
  Bot,
  Image as ImageIcon,
  Layers,
  Library,
  Search,
  SquarePen,
  SquareTerminal,
} from "@lucide/vue"
import type { Component } from "vue"

import type { AppViewId } from "@/types/navigation"

import SidebarAppBarItem from "./SidebarAppBarItem.vue"

const props = withDefaults(
  defineProps<{
    activeAppView?: AppViewId | null
  }>(),
  {
    activeAppView: null,
  }
)

const emit = defineEmits<{
  (event: "new-conversation"): void
  (event: "search"): void
  (event: "select-app-view", appView: AppViewId): void
}>()

const appViews: Array<{
  id: AppViewId
  label: string
  icon: Component
}> = [
  { id: "library", label: "Library", icon: Library },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "static", label: "Static", icon: Layers },
  { id: "sandbox", label: "Sandbox", icon: SquareTerminal },
]
</script>

<template>
  <nav class="sidebar-actions" aria-label="Main navigation">
    <div class="sidebar-actions__group">
      <SidebarAppBarItem
        :icon="SquarePen"
        label="New chat"
        @select="emit('new-conversation')"
      />
      <SidebarAppBarItem
        :icon="Search"
        label="Search chats"
        @select="emit('search')"
      />
    </div>

    <div class="sidebar-actions__group" aria-label="OpenGPT apps">
      <SidebarAppBarItem
        v-for="appView in appViews"
        :key="appView.id"
        :icon="appView.icon"
        :label="appView.label"
        :active="props.activeAppView === appView.id"
        @select="emit('select-app-view', appView.id)"
      />
    </div>
  </nav>
</template>

<style scoped>
.sidebar-actions {
  display: grid;
  gap: 0.45rem;
  padding: 0.15rem 0.4rem 0.55rem;
}

.sidebar-actions__group {
  display: grid;
  gap: 1px;
}
</style>
