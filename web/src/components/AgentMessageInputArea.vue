<template>
  <div class="message-input-container">
    <!-- 1. 附件预览区 -->
    <div v-if="images.length > 0 || attachments.length > 0" class="preview-section">
      <AttachmentCapsules 
        :images="images" 
        :attachments="attachments"
        @remove-image="handleRemoveImage"
        @remove-attachment="handleRemoveAttachment"
      />
    </div>

    <!-- 2. 文本输入区 -->
    <textarea 
      ref="inputRef" 
      :value="text" 
      class="message-textarea" 
      :placeholder="placeholder" 
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeydown" 
    />

    <!-- 3. 底部工具栏 -->
    <div class="input-toolbar">
      <div class="toolbar-left">
        <slot name="actions-left">
          <button type="button" class="icon-btn" @click="handleClickAttachment" title="添加附件">
            <Paperclip :size="20" />
          </button>
        </slot>
      </div>

      <div class="toolbar-right">
        <!-- 模型选择按钮 & 弹出面板 -->
        <div class="model-selector-wrapper">
          <button 
            type="button" 
            class="icon-btn model-btn" 
            :class="{ active: showModelSelector }"
            @click="toggleModelSelector" 
            title="选择模型"
          >
            <Sparkles :size="18" />
          </button>
          
          <!-- <ModelSelector 
            :show="showModelSelector" 
            :current-model-id="selectedModelId"
            @select="handleModelSelect"
          /> -->
        </div>

        <slot name="actions-right">
          <button 
            type="button" 
            class="send-btn" 
            :disabled="!canSend" 
            @click="emitSend"
          >
            <ArrowUp :size="18" />
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue"
import { Paperclip, ArrowUp, Sparkles } from "lucide-vue-next"
import AttachmentCapsules from "./AttachmentCapsules.vue"
// import ModelSelector from "./ModelSelector.vue"

const inputRef = ref<HTMLTextAreaElement | null>(null)
const showModelSelector = ref(false)

const emit = defineEmits<{
  (e: 'update:text', value: string): void
  (e: 'update:selectedModelId', value: string): void
  (e: 'send'): void
  (e: 'clickAttachment'): void
  (e: 'removeImage', index: number): void
  (e: 'removeAttachment', index: number): void
}>()

const props = defineProps({
  text: { type: String, default: "" },
  images: {
    type: Array as () => Array<{ src: string; file?: File; fileName?: string }>,
    default: () => [],
  },
  attachments: {
    type: Array as () => Array<{ name?: string; file_name?: string }>,
    default: () => [],
  },
  placeholder: { type: String, default: "输入问题..." },
  selectedModelId: { type: String, default: "gpt-4o" },
  disabled: { type: Boolean, default: false }
})

const canSend = computed(() => {
  if (props.disabled) {
    return false
  }
  return props.text.trim().length > 0 || props.images.length > 0 || props.attachments.length > 0
})

// --- 逻辑处理 ---

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit("update:text", target.value)
}

const toggleModelSelector = (e: Event) => {
  e.stopPropagation()
  showModelSelector.value = !showModelSelector.value
}

const handleModelSelect = (id: string) => {
  emit('update:selectedModelId', id)
  showModelSelector.value = false
}

const handleRemoveImage = (index: number) => {
  emit('removeImage', index)
}

const handleRemoveAttachment = (index: number) => {
  emit('removeAttachment', index)
}

const handleClickAttachment = () => {
  emit('clickAttachment')
}

const emitSend = () => {
  if (!canSend.value) return
  emit("send")
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    emitSend()
  }
}

// 点击外部关闭面板
const closeSelector = () => {
  showModelSelector.value = false
}

onMounted(() => {
  window.addEventListener('click', closeSelector)
})

onUnmounted(() => {
  window.removeEventListener('click', closeSelector)
})

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped>
.message-input-container {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s;
}

.message-input-container:focus-within {
  border-color: #3b82f6;
}

.preview-section {
  margin-bottom: 4px;
}

.message-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  border: none;
  background: transparent;
  resize: none;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
  padding: 4px 0;
}

.message-textarea:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  margin-top: 4px;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-selector-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover, .model-btn.active {
  background: #f1f5f9;
  color: #3b82f6;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover {
  background: #2563eb;
  transform: translateY(-1px);
}
</style>
