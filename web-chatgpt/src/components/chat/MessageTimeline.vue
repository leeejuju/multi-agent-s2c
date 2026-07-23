<script setup lang="ts">
import { nextTick, ref, watch } from "vue"

import type { PrototypeMessage } from "@/types/prototype"

import ConnectionNotice from "./ConnectionNotice.vue"
import MessageItem from "./MessageItem.vue"

const props = defineProps<{
  messages: PrototypeMessage[]
  isPreviewNoticeVisible: boolean
}>()

const timelineElement = ref<HTMLDivElement | null>(null)

watch(
  () => [props.messages.length, props.isPreviewNoticeVisible],
  async () => {
    await nextTick()
    const element = timelineElement.value
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  },
)
</script>

<template>
  <div
    ref="timelineElement"
    class="message-timeline"
    aria-label="本地对话记录"
  >
    <div class="message-timeline__inner">
      <MessageItem
        v-for="message in props.messages"
        :key="message.id"
        :message="message"
      />

      <ConnectionNotice v-if="props.isPreviewNoticeVisible" />
    </div>
  </div>
</template>

<style scoped>
.message-timeline {
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--surface-strong) transparent;
}

.message-timeline__inner {
  display: flex;
  width: min(100%, var(--content-width));
  min-height: 100%;
  margin: 0 auto;
  flex-direction: column;
  justify-content: flex-end;
  gap: 1.75rem;
  padding: clamp(1.2rem, 3.5vh, 2.4rem) clamp(1rem, 3vw, 1.5rem) 1.25rem;
}

.message-timeline__inner :deep(.connection-notice) {
  align-self: flex-start;
}
</style>
