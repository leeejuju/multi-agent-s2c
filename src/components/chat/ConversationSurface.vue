<script setup lang="ts">
import type {
  PrototypeAttachment,
  PrototypeMessage,
} from "@/types/prototype"

import ConversationEmptyState from "./ConversationEmptyState.vue"
import ConversationHeader from "./ConversationHeader.vue"
import MessageTimeline from "./MessageTimeline.vue"
import PromptComposer from "./PromptComposer.vue"

const props = defineProps<{
  messages: PrototypeMessage[]
  attachments: PrototypeAttachment[]
  draft: string
  sidebarCollapsed: boolean
  isPreviewNoticeVisible: boolean
}>()

const emit = defineEmits<{
  "update:draft": [value: string]
  submit: []
  "files-selected": [files: File[]]
  "remove-attachment": [id: string]
  "toggle-sidebar": []
  "new-conversation": []
}>()
</script>

<template>
  <main class="conversation-surface" aria-label="OpenGPT 对话">
    <ConversationHeader
      :sidebar-collapsed="props.sidebarCollapsed"
      @toggle-sidebar="emit('toggle-sidebar')"
      @new-conversation="emit('new-conversation')"
    />

    <div class="conversation-surface__body">
      <ConversationEmptyState
        v-if="!props.messages.length && !props.isPreviewNoticeVisible"
      />

      <MessageTimeline
        v-else
        :messages="props.messages"
        :is-preview-notice-visible="props.isPreviewNoticeVisible"
      />
    </div>

    <div class="conversation-surface__composer">
      <PromptComposer
        :draft="props.draft"
        :attachments="props.attachments"
        @update:draft="emit('update:draft', $event)"
        @submit="emit('submit')"
        @files-selected="emit('files-selected', $event)"
        @remove-attachment="emit('remove-attachment', $event)"
      />
      <p>OpenGPT 可能会出错。请核查重要信息。</p>
    </div>
  </main>
</template>

<style scoped>
.conversation-surface {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100dvh;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: var(--canvas);
  color: var(--ink);
}

.conversation-surface__body {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.conversation-surface__body > :deep(*) {
  min-width: 0;
}

.conversation-surface__composer {
  display: grid;
  width: 100%;
  flex: 0 0 auto;
  justify-items: center;
  gap: 0.45rem;
  border-top: 1px solid transparent;
  background: var(--canvas);
  padding: 0.75rem clamp(1rem, 4vw, 2rem) 0.55rem;
}

.conversation-surface__composer > :deep(form) {
  width: min(100%, var(--composer-width));
}

.conversation-surface__composer > p {
  margin: 0;
  color: var(--muted);
  font-size: 0.66rem;
  line-height: 1.45;
  text-align: center;
}

@media (max-width: 560px) {
  .conversation-surface__composer {
    gap: 0.35rem;
    padding: 0.55rem 0.75rem 0;
  }

  .conversation-surface__composer > p {
    padding: 0 0.75rem max(0.35rem, env(safe-area-inset-bottom));
  }
}
</style>
