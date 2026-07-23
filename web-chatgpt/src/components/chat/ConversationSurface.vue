<script setup lang="ts">
import { computed } from "vue"

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

const isEmptyState = computed(
  () => !props.messages.length && !props.isPreviewNoticeVisible
)
</script>

<template>
  <main class="conversation-surface" aria-label="OpenGPT 对话">
    <ConversationHeader
      :sidebar-collapsed="props.sidebarCollapsed"
      @toggle-sidebar="emit('toggle-sidebar')"
      @new-conversation="emit('new-conversation')"
    />

    <div v-if="isEmptyState" class="conversation-surface__center-stage">
      <div class="conversation-surface__hero">
        <ConversationEmptyState />
        <PromptComposer
          :draft="props.draft"
          :attachments="props.attachments"
          @update:draft="emit('update:draft', $event)"
          @submit="emit('submit')"
          @files-selected="emit('files-selected', $event)"
          @remove-attachment="emit('remove-attachment', $event)"
        />
        <p class="conversation-surface__disclaimer">
          OpenGPT can make mistakes. Verify important info.
        </p>
      </div>
    </div>

    <template v-else>
      <div class="conversation-surface__body">
        <MessageTimeline
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
        <p class="conversation-surface__disclaimer">
          OpenGPT can make mistakes. Verify important info.
        </p>
      </div>
    </template>
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

.conversation-surface__center-stage {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 1.5rem clamp(1rem, 4vw, 2rem) 4rem;
}

.conversation-surface__hero {
  display: flex;
  width: min(100%, var(--composer-width));
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.conversation-surface__hero > :deep(form) {
  width: 100%;
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
  gap: 0.55rem;
  background: transparent;
  padding: 0.35rem clamp(1rem, 4vw, 2rem) 0.7rem;
}

.conversation-surface__composer > :deep(form) {
  width: min(100%, var(--composer-width));
}

.conversation-surface__disclaimer {
  margin: 0;
  color: var(--faint);
  font-size: 0.68rem;
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 560px) {
  .conversation-surface__center-stage {
    padding: 1rem 0.9rem 2.5rem;
  }

  .conversation-surface__composer {
    gap: 0.4rem;
    padding: 0.25rem 0.9rem max(0.45rem, env(safe-area-inset-bottom));
  }
}
</style>
