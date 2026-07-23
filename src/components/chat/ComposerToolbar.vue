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
      aria-label="添加文件"
      title="添加文件"
      @click="openFilePicker"
    >
      <Plus :size="20" :stroke-width="1.9" aria-hidden="true" />
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
  gap: 0.52rem;
}

.composer-toolbar button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink);
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.composer-toolbar button:hover {
  border-color: var(--line);
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

@media (prefers-reduced-motion: reduce) {
  .composer-toolbar button {
    transition: none;
  }
}
</style>
