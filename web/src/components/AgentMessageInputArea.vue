<template>
  <div class="message-input-wrapper">
    <div v-if="$slots.imagePreview" class="input-slot">
      <slot name="imagePreview" />
    </div>

    <div v-if="$slots.attachmentOption" class="input-slot">
      <slot name="attachmentOption" />
    </div>

    <textarea
      ref="inputRef"
      v-model="proxyModelValue"
      class="message-textarea"
      :placeholder="placeholder"
      @keydown="handleKeydown"
    />

    <div class="input-footer">
      <button
        type="button"
        class="send-button"
        :disabled="!canSend"
        @click="emitSend"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from "vue"

const inputRef = ref<HTMLTextAreaElement | null>(null)

const emit = defineEmits(["update:modelValue", "send"])

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "输入问题...",
  },
  files: {
    type: Array as PropType<File[]>,
    default: () => [],
  },
})

const proxyModelValue = computed({
  get: () => props.modelValue,
  set: (val: string) => emit("update:modelValue", val),
})

const canSend = computed(() => proxyModelValue.value.trim().length > 0)

const emitSend = () => {
  const text = proxyModelValue.value.trim()

  if (!text) {
    return
  }

  emit("send", text)
  emit("update:modelValue", "")
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
  padding: 16px;
}

.input-slot {
  display: flex;
  align-items: center;
}

.message-textarea {
  width: 100%;
  min-height: 120px;
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

.input-footer {
  display: flex;
  justify-content: flex-end;
}

.send-button {
  border: none;
  border-radius: 9999px;
  padding: 8px 16px;
  cursor: pointer;
  background: #0f172a;
  color: #fff;
  font-size: 14px;
}

.send-button:disabled {
  cursor: not-allowed;
  background: #cbd5e1;
}
</style>
