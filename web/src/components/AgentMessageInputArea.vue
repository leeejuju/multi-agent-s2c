<template>
  <div class="message-input-wrapper">
    <div v-if="$slots.attachment" class="input-slot attachment-slot">
      <slot name="attachment" />
    </div>

    <div class="input-action-area">
      <slot name="action" />
    </div>
    <textarea ref="inputRef" :value="text" class="message-textarea" :placeholder="placeholder" @input="handleInput"
      @keydown="handleKeydown" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

const inputRef = ref<HTMLTextAreaElement | null>(null)

const emit = defineEmits(["update:text", "update:images", "update:attachments", "send"])

const props = defineProps({
  text: {
    type: String,
    default: "",
  },
  images: {
    type: Array as () => Array<{ src: string; file?: File }>,
    default: () => [],
  },
  attachments: {
    type: Array as () => File[],
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "输入问题...",
  },
})

const canSend = computed(() => {
  return props.text.trim().length > 0 || props.images.length > 0 || props.attachments.length > 0
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit("update:text", target.value)
}

const emitSend = () => {
  if (!canSend.value) return
  emit("send")
  inputRef.value?.focus()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    emitSend()
  }
}
</script>

<style scoped>
.message-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #d7dee8;
  border-radius: 24px;
  background: #f8fafc;
  padding: 12px;
}

.input-slot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.message-textarea {
  width: 100%;
  min-height: 60px;
  border: none;
  background: transparent;
  resize: none;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  color: #0f172a;
}

.message-textarea::placeholder {
  color: #94a3b8;
}

.send-button {
  border: none;
  border-radius: 9999px;
  padding: 8px 16px;
  cursor: pointer;
  background: #0f172a;
  color: #fff;
  font-size: 14px;
  transition: background-color 0.2s;
}

.send-button:disabled {
  cursor: not-allowed;
  background: #cbd5e1;
}
</style>
