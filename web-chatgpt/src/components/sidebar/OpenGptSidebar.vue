<script setup lang="ts">
import type { AppViewId } from "@/types/navigation";
import type { PrototypeConversation } from "@/types/prototype";

import ConversationList from "./ConversationList.vue";
import SidebarActions from "./SidebarActions.vue";
import SidebarFooter from "./SidebarFooter.vue";
import SidebarHeader from "./SidebarHeader.vue";

const props = withDefaults(
  defineProps<{
    conversations: PrototypeConversation[];
    activeConversationId?: string | null;
    activeAppView?: AppViewId | null;
    mobileOpen?: boolean;
  }>(),
  {
    activeConversationId: null,
    activeAppView: null,
    mobileOpen: false,
  },
);

const emit = defineEmits<{
  (event: "new-conversation"): void;
  (event: "search"): void;
  (event: "select-app-view", appView: AppViewId): void;
  (event: "select-conversation", conversationId: string): void;
  (event: "open-settings"): void;
  (event: "close-mobile"): void;
}>();
</script>

<template>
  <aside
    class="opengpt-sidebar"
    :class="{ 'opengpt-sidebar--mobile-open': props.mobileOpen }"
    aria-label="OpenGPT Sidebar"
  >
    <SidebarHeader @close-mobile="emit('close-mobile')" />
    <SidebarActions
      :active-app-view="props.activeAppView"
      @new-conversation="emit('new-conversation')"
      @search="emit('search')"
      @select-app-view="emit('select-app-view', $event)"
    />
    <ConversationList
      :conversations="props.conversations"
      :active-conversation-id="props.activeConversationId"
      @select-conversation="emit('select-conversation', $event)"
    />
    <SidebarFooter @open-settings="emit('open-settings')" />
  </aside>
</template>

<style scoped>
.opengpt-sidebar {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--sidebar);
  color: var(--ink);
}

.opengpt-sidebar--mobile-open {
  isolation: isolate;
}
</style>
