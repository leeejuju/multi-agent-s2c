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
    aria-label="Pending local attachments"
  >
    <li v-for="attachment in props.attachments" :key="attachment.id">
      <File
        class="attachment-tray__icon"
        :size="16"
        :stroke-width="1.8"
        aria-hidden="true"
      />

      <div class="attachment-tray__details">
        <strong :title="attachment.name">{{ attachment.name }}</strong>
        <span>{{ formatFileSize(attachment.size) }}</span>
      </div>

      <button
        class="context-actions attachment-tray__remove"
        type="button"
        :aria-label="`Remove attachment ${attachment.name}`"
        :title="`Remove ${attachment.name}`"
        @click="emit('remove-attachment', attachment.id)"
      >
        <X :size="15" :stroke-width="1.8" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.attachment-tray {
  display: flex;
  margin: 0;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 0 0 0.15rem;
  list-style: none;
  scrollbar-width: thin;
}

.attachment-tray li {
  position: relative;
  display: grid;
  min-width: min(200px, 70vw);
  max-width: 240px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  background: transparent;
}

.attachment-tray__icon {
  color: var(--muted);
}

.attachment-tray__details {
  display: grid;
  min-width: 0;
  gap: 0.05rem;
}

.attachment-tray__details strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 0.78rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-tray__details span {
  color: var(--faint);
  font-size: 0.68rem;
}

.attachment-tray__remove {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
}

.attachment-tray__remove:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.attachment-tray__remove:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
</style>
