<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { ArrowUp } from "@lucide/vue"

import type { PrototypeAttachment } from "@/types/prototype"

import AttachmentTray from "./AttachmentTray.vue"
import ComposerToolbar from "./ComposerToolbar.vue"

const props = defineProps<{
  draft: string
  attachments: PrototypeAttachment[]
}>()

const emit = defineEmits<{
  "update:draft": [value: string]
  submit: []
  "files-selected": [files: File[]]
  "remove-attachment": [id: string]
}>()

const textareaElement = ref<HTMLTextAreaElement | null>(null)

const draftModel = computed({
  get: () => props.draft,
  set: (value: string) => emit("update:draft", value),
})

const canSubmit = computed(
  () => props.draft.trim().length > 0 || props.attachments.length > 0,
)

function resizeTextarea(element = textareaElement.value) {
  if (!element) {
    return
  }

  element.style.height = "auto"
  element.style.height = `${Math.min(element.scrollHeight, 180)}px`
}

function handleInput(event: Event) {
  resizeTextarea(event.target as HTMLTextAreaElement)
}

function submitDraft() {
  if (canSubmit.value) {
    emit("submit")
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    submitDraft()
  }
}

watch(
  () => props.draft,
  async () => {
    await nextTick()
    resizeTextarea()
  },
)
</script>

<template>
  <form class="prompt-composer" @submit.prevent="submitDraft">
    <AttachmentTray
      :attachments="props.attachments"
      @remove-attachment="emit('remove-attachment', $event)"
    />

    <div class="prompt-composer__row">
      <ComposerToolbar @files-selected="emit('files-selected', $event)" />

      <label class="prompt-composer__input">
        <span class="prompt-composer__label">Type a message</span>
        <textarea
          ref="textareaElement"
          v-model="draftModel"
          rows="1"
          placeholder="Ask anything"
          aria-label="Type a message"
          @input="handleInput"
          @keydown="handleKeydown"
        />
      </label>

      <button
        class="prompt-composer__submit"
        type="submit"
        :disabled="!canSubmit"
        aria-label="Send message"
        title="Send message"
      >
        <ArrowUp :size="18" :stroke-width="2" aria-hidden="true" />
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Capsule / pill-shaped input container */
.prompt-composer {
  display: grid;
  width: 100%;
  gap: 0.65rem;
  background: transparent;
  padding: 0;
}

.prompt-composer__row {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem 0.35rem 0.75rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.prompt-composer:focus-within .prompt-composer__row {
  border-color: rgb(13 13 13 / 24%);
  box-shadow: 0 0 0 1px rgb(13 13 13 / 10%);
}

.prompt-composer__input {
  display: block;
  min-width: 0;
  flex: 1;
}

.prompt-composer__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.prompt-composer textarea {
  display: block;
  width: 100%;
  min-height: 38px;
  max-height: 180px;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 0.45rem 0.25rem;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.5;
  resize: none;
}

.prompt-composer textarea::placeholder {
  color: var(--faint);
}

.prompt-composer__submit {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  margin-bottom: 2px;
  place-items: center;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--ink);
  opacity: 0.22;
  transition: background-color 120ms ease, opacity 120ms ease, color 120ms ease;
}

.prompt-composer__submit:not(:disabled) {
  opacity: 1;
  background: var(--ink);
  color: var(--surface);
}

.prompt-composer__submit:hover:not(:disabled) {
  background: var(--accent-hover);
}

.prompt-composer__submit:disabled {
  cursor: not-allowed;
}

.prompt-composer__submit:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.prompt-composer :deep(.composer-toolbar button) {
  width: 34px;
  height: 34px;
  margin-bottom: 2px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
}

.prompt-composer :deep(.composer-toolbar button:hover) {
  background: var(--surface-strong);
  color: var(--ink);
}

@media (max-width: 560px) {
  .prompt-composer textarea {
    font-size: 0.92rem;
  }
}
</style>
