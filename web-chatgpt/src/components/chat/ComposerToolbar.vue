<script setup lang="ts">
import { ref } from "vue"
import { Plus } from "@lucide/vue"

const emit = defineEmits<{
  "files-selected": [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileSelection(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  if (files.length) {
    emit("files-selected", files)
  }

  input.value = ""
}
</script>

<template>
  <div class="composer-toolbar">
    <button
      type="button"
      aria-label="Add files"
      title="Add files"
      @click="openFilePicker"
    >
      <Plus :size="20" :stroke-width="1.8" aria-hidden="true" />
    </button>

    <input
      ref="fileInput"
      class="composer-toolbar__file-input"
      type="file"
      multiple
      @change="handleFileSelection"
    >
  </div>
</template>

<style scoped>
.composer-toolbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.25rem;
}

.composer-toolbar button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
}

.composer-toolbar button:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.composer-toolbar button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.composer-toolbar__file-input {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
