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
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
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

    <label class="prompt-composer__input">
      <span class="prompt-composer__label">输入消息</span>
      <textarea
        ref="textareaElement"
        v-model="draftModel"
        rows="1"
        placeholder="询问任何问题"
        aria-label="输入消息"
        @input="handleInput"
        @keydown="handleKeydown"
      />
    </label>

    <div class="prompt-composer__footer">
      <ComposerToolbar @files-selected="emit('files-selected', $event)" />

      <button
        class="prompt-composer__submit"
        type="submit"
        :disabled="!canSubmit"
        aria-label="保存本地消息"
        title="保存本地消息"
      >
        <ArrowUp :size="18" :stroke-width="2.2" aria-hidden="true" />
      </button>
    </div>
  </form>
</template>

<style scoped>
.prompt-composer {
  display: grid;
  width: 100%;
  gap: 0.72rem;
  border: 0;
  border-radius: 28px;
  background: var(--surface-muted);
  padding: 0.62rem 0.68rem;
}

.prompt-composer:focus-within {
  background: #f1f1f1;
}

.prompt-composer__input {
  display: block;
  min-width: 0;
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
  min-height: 44px;
  max-height: 180px;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 0.55rem 0.55rem 0.2rem;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.55;
  resize: none;
}

.prompt-composer textarea::placeholder {
  color: var(--muted);
}

.prompt-composer__footer {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.prompt-composer__submit {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
  color: var(--surface);
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    opacity 150ms ease;
}

.prompt-composer__submit:hover:not(:disabled) {
  background: var(--accent-hover);
}

.prompt-composer__submit:disabled {
  cursor: not-allowed;
  opacity: 0.34;
}

.prompt-composer__submit:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

@media (max-width: 560px) {
  .prompt-composer {
    border-radius: 24px;
    padding: 0.58rem 0.62rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .prompt-composer__submit {
    transition: none;
  }
}
</style>
