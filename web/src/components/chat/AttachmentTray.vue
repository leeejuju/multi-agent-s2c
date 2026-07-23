<script setup lang="ts">
import { File, X } from "@lucide/vue"

import type { PrototypeAttachment } from "@/types/prototype"

const props = defineProps<{
  attachments: PrototypeAttachment[]
}>()

const emit = defineEmits<{
  "remove-attachment": [id: string]
}>()

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <ul
    v-if="props.attachments.length"
    class="attachment-tray"
    aria-label="待发送的本地附件"
  >
    <li v-for="attachment in props.attachments" :key="attachment.id">
      <File class="attachment-tray__icon" :size="17" aria-hidden="true" />

      <div class="attachment-tray__details">
        <strong :title="attachment.name">{{ attachment.name }}</strong>
        <span>{{ formatFileSize(attachment.size) }} · 本地文件</span>
      </div>

      <button
        type="button"
        :aria-label="`移除附件 ${attachment.name}`"
        :title="`移除 ${attachment.name}`"
        @click="emit('remove-attachment', attachment.id)"
      >
        <X :size="15" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.attachment-tray {
  display: flex;
  margin: 0;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0 0 0.1rem;
  list-style: none;
  scrollbar-width: thin;
}

.attachment-tray li {
  display: grid;
  min-width: min(240px, 78vw);
  max-width: 280px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 0.55rem 0.55rem 0.55rem 0.68rem;
}

.attachment-tray__icon {
  color: var(--accent);
}

.attachment-tray__details {
  display: grid;
  min-width: 0;
  gap: 0.08rem;
}

.attachment-tray__details strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 0.76rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-tray__details span {
  color: var(--muted);
  font-size: 0.67rem;
}

.attachment-tray button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.attachment-tray button:hover {
  border-color: var(--surface-strong);
  background: var(--surface);
  color: var(--ink);
}

.attachment-tray button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .attachment-tray button {
    transition: none;
  }
}
</style>
