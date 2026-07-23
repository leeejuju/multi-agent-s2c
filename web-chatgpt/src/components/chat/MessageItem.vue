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

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
})
</script>

<template>
  <article class="message-item" aria-label="User message">
    <div class="message-item__body">
      <p v-if="props.message.content">{{ props.message.content }}</p>

      <ul
        v-if="props.message.attachments.length"
        class="message-item__attachments"
        aria-label="Message attachments"
      >
        <li
          v-for="attachment in props.message.attachments"
          :key="attachment.id"
          :title="attachment.name"
        >
          <FileText :size="14" :stroke-width="1.8" aria-hidden="true" />
          <span>{{ attachment.name }}</span>
        </li>
      </ul>
    </div>

    <time
      v-if="formattedTime"
      class="context-actions"
      :datetime="props.message.createdAt"
    >
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
  gap: 0.3rem;
}

/* No bubble chrome — alignment + type carry hierarchy */
.message-item__body {
  display: grid;
  width: fit-content;
  max-width: min(78%, 640px);
  gap: 0.55rem;
  padding: 0.15rem 0;
  color: var(--ink);
}

.message-item__body p {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 0.95rem;
  line-height: 1.7;
}

.message-item__attachments {
  display: flex;
  margin: 0;
  flex-wrap: wrap;
  gap: 0.55rem 0.85rem;
  padding: 0;
  list-style: none;
}

.message-item__attachments li {
  display: flex;
  min-width: 0;
  max-width: 240px;
  align-items: center;
  gap: 0.35rem;
  color: var(--muted);
  font-size: 0.75rem;
}

.message-item__attachments li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-item time {
  padding-right: 0.05rem;
  color: var(--faint);
  font-size: 0.68rem;
}

@media (max-width: 640px) {
  .message-item__body {
    max-width: 92%;
  }
}
</style>
