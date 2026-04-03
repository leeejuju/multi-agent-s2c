<template>
  <div class="message-input-container">
    <!-- 1. 附件预览区 -->
    <div v-if="images.length > 0 || attachments.length > 0" class="preview-section">
      <AttachmentCapsules :images="images" :attachments="attachments" @remove-image="handleRemoveImage"
        @remove-attachment="handleRemoveAttachment" />
    </div>

    <!-- 2. 文本输入区 -->
    <textarea ref="inputRef" :value="text" class="message-textarea" :placeholder="placeholder" :disabled="disabled"
      @input="handleInput" @keydown="handleKeydown" />

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
        <div class="model-selector-wrapper">
          <button type="button" class="icon-btn model-btn" :class="{ active: showModelSelector }"
            @click="toggleModelSelector" title="选择模型">
            <Sparkles :size="18" />
          </button>

          <!-- <ModelSelector 
            :show="showModelSelector" 
            :current-model-id="selectedModelId"
            @select="handleModelSelect"
          /> -->
        </div>

        <slot name="actions-right">
          <button type="button" class="send-btn" :disabled="!canSend" @click.stop="triggerSend">
            <ArrowUp :size="16" />
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
    type: Array as () => Array<{ id?: string; src: string; file?: File; fileName?: string; uploading?: boolean }>,
    default: () => [],
  },
  attachments: {
    type: Array as () => Array<{ id?: string; name?: string; file_name?: string; uploading?: boolean }>,
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

const triggerSend = () => {
  if (!canSend.value) {
    return
  }
  emit("send")
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    triggerSend()
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

.toolbar-left,
.toolbar-right {
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
  background: #f1f5f9;
  /* 淡灰色 */
  color: #64748b;
  border-radius: 50%;
  /* 圆形 */
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover,
.model-btn.active {
  background: #e2e8f0;
  /* hover稍微深一点的灰色 */
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
  border-radius: 50%;
  /* 圆形 */
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

.message-input-container {
  gap: 8px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 24px;
  padding: 10px 12px 12px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 10px 30px rgba(15, 23, 42, 0.06);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.message-input-container:focus-within {
  border-color: rgba(15, 23, 42, 0.16);
  box-shadow:
    0 0 0 4px rgba(15, 23, 42, 0.045),
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 14px 32px rgba(15, 23, 42, 0.08);
}

.preview-section {
  padding-bottom: 8px;
}

.message-textarea {
  min-height: 56px;
  max-height: 220px;
  padding: 2px 2px 0;
  font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", sans-serif;
  font-size: 15px;
  line-height: 1.72;
}

.message-textarea::placeholder {
  color: #94a3b8;
}

.input-toolbar {
  padding-top: 8px;
  margin-top: 2px;
}

.toolbar-left,
.toolbar-right {
  gap: 10px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(248, 250, 252, 0.96);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.icon-btn:hover,
.model-btn.active {
  border-color: rgba(148, 163, 184, 0.52);
  background: #ffffff;
  color: #0f172a;
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 10px 20px rgba(148, 163, 184, 0.18);
}

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.96);
  background: linear-gradient(180deg, #111827, #0f172a);
  color: #ffffff;
  border-radius: 14px;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.send-btn:disabled {
  border-color: rgba(226, 232, 240, 0.96);
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.send-btn :deep(svg) {
  transition: transform 0.2s ease;
}

.send-btn:not(:disabled):hover {
  background: linear-gradient(180deg, #0f172a, #020617);
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.2);
}

.send-btn:not(:disabled):hover :deep(svg) {
  transform: translateY(-1px);
}
</style>
