<script setup lang="ts">
import { computed } from "vue"
import { FileText } from "@lucide/vue"

import type { PrototypeMessage } from "@/types/prototype"

const props = defineProps<{
  message: PrototypeMessage
}>()

const formattedTime = computed(() => {
  const date = new Date(props.message.createdAt)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
})
</script>

<template>
  <article class="message-item" aria-label="本地用户消息">
    <div class="message-item__bubble">
      <p v-if="props.message.content">{{ props.message.content }}</p>

      <ul
        v-if="props.message.attachments.length"
        class="message-item__attachments"
        aria-label="消息附件"
      >
        <li
          v-for="attachment in props.message.attachments"
          :key="attachment.id"
          :title="attachment.name"
        >
          <FileText :size="15" aria-hidden="true" />
          <span>{{ attachment.name }}</span>
        </li>
      </ul>
    </div>

    <time v-if="formattedTime" :datetime="props.message.createdAt">
      {{ formattedTime }}
    </time>
  </article>
</template>

<style scoped>
.message-item {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.38rem;
}

.message-item__bubble {
  display: grid;
  width: fit-content;
  max-width: min(78%, 680px);
  gap: 0.72rem;
  border: 0;
  border-radius: 20px 20px 4px 20px;
  background: var(--accent-soft);
  padding: 0.78rem 0.92rem;
  color: var(--ink);
}

.message-item__bubble p {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 0.94rem;
  line-height: 1.65;
}

.message-item__attachments {
  display: flex;
  margin: 0;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0;
  list-style: none;
}

.message-item__attachments li {
  display: flex;
  min-width: 0;
  max-width: 240px;
  align-items: center;
  gap: 0.38rem;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  padding: 0.42rem 0.55rem;
  color: var(--muted);
  font-size: 0.75rem;
}

.message-item__attachments li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-item time {
  padding-right: 0.2rem;
  color: var(--muted);
  font-size: 0.68rem;
}

@media (max-width: 640px) {
  .message-item__bubble {
    max-width: 90%;
  }
}
</style>
