<template>
  <aside class="chat-panel">
    <div class="chat-shell">
      <header class="chat-header">
        <h1 class="chat-title">对话面板</h1>
      </header>

      <section class="chat-body">
        <div v-if="messages.length === 0" class="empty-state">
          <!-- 这里可以加一些欢迎语或占位图 -->
        </div>

        <div v-else class="message-list">
          <div v-for="(message, index) in messages" :key="`${message.role}-${index}`" class="message-item"
            :class="message.role === 'user' ? 'is-user' : 'is-assistant'">
            <div class="message-content">
              <span v-if="message.images?.length" class="message-meta">[图片] </span>
              <span v-if="message.attachments?.length" class="message-meta">[附件] </span>
              {{ message.content }}
            </div>
          </div>
        </div>
      </section>

      <footer class="chat-footer">
        <AgentMessageInputArea 
          :text="draftText" 
          :images="draftImages" 
          :attachments="draftAttachments"
          :selected-model-id="selectedModelId"
          @update:text="handleUpdateText" 
          @update:selected-model-id="handleUpdateModelId"
          @send="handleSend"
          @click-attachment="triggerFileInput"
          @remove-image="handleRemoveImage"
          @remove-attachment="handleRemoveAttachment"
        >
          <!-- 隐藏的文件输入框 -->
          <template #actions-left>
            <label class="attachment-upload-trigger">
              <input 
                ref="fileInputRef"
                type="file" 
                multiple 
                :accept="acceptTypes" 
                style="display: none;" 
                @change="handleFileChange" 
              />
              <button type="button" class="action-icon-btn" @click="triggerFileInput">
                <Paperclip :size="20" />
              </button>
            </label>
          </template>
        </AgentMessageInputArea>
      </footer>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { Paperclip } from "lucide-vue-next"
import AgentMessageInputArea from "./AgentMessageInputArea.vue"

const fileInputRef = ref<HTMLInputElement | null>(null)

const acceptTypes =
  import.meta.env.VITE_FILE_ACCEPT ||
  ".txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.ico,.tif,.tiff,.heic,.heif"

type DraftImage = {
  src: string
  file?: File
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  images?: DraftImage[]
  attachments?: File[]
}

const draftText = ref("")
const draftImages = ref<DraftImage[]>([])
const draftAttachments = ref<File[]>([])
const messages = ref<ChatMessage[]>([])
const selectedModelId = ref("gpt-4o")


const handleUpdateText = (val: string) => {
  draftText.value = val
}

const handleUpdateModelId = (id: string) => {
  selectedModelId.value = id
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const selectedFiles = Array.from(target.files)
    handleUploadFiles(selectedFiles)
    target.value = ""
  }
}

const handleUploadFiles = (newFiles: File[]) => {
  const imageFiles = newFiles.filter(file => file.type.startsWith("image/"))
  const otherFiles = newFiles.filter(file => !file.type.startsWith("image/"))

  if (imageFiles.length > 0) {
    const newImages = imageFiles.map(file => ({
      src: URL.createObjectURL(file),
      file,
    }))
    draftImages.value = [...draftImages.value, ...newImages]
  }

  if (otherFiles.length > 0) {
    draftAttachments.value = [...draftAttachments.value, ...otherFiles]
  }
}

const handleRemoveImage = (index: number) => {
  if (draftImages.value[index]?.src) {
    URL.revokeObjectURL(draftImages.value[index].src)
  }
  draftImages.value = draftImages.value.filter((_, imageIndex) => imageIndex !== index)
}

const handleRemoveAttachment = (index: number) => {
  draftAttachments.value = draftAttachments.value.filter((_, attachmentIndex) => attachmentIndex !== index)
}

const handleSend = () => {
  const trimmedText = draftText.value.trim()
  if (!trimmedText && draftImages.value.length === 0 && draftAttachments.value.length === 0) {
    return
  }

  messages.value.push({
    role: "user",
    content: trimmedText,
    images: [...draftImages.value],
    attachments: [...draftAttachments.value],
  })

  draftText.value = ""
  draftImages.value = []
  draftAttachments.value = []
}
</script>

<style scoped>
.chat-panel {
  position: relative;
  display: flex;
  height: 100%;
  /* 增加宽度 */
  width: min(440px, calc(100vw - 2rem));
  justify-content: flex-end;
  /* 垂直居中 */
  align-items: center;
  padding: 16px 16px 16px 0;
  pointer-events: none;
}

.chat-shell {
  pointer-events: auto;
  display: flex;
  /* 减小高度，上下留白 */
  height: calc(100% - 32px);
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(215, 222, 232, 0.9);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14);
}

.chat-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(215, 222, 232, 0.9);
}

.chat-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #64748b;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  max-width: 85%;
  border-radius: 18px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-meta {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
}

.is-user {
  align-self: flex-end;
  background: #0f172a;
  color: #fff;
}

.is-assistant {
  align-self: flex-start;
  border: 1px solid #d7dee8;
  background: #fff;
  color: #0f172a;
}

.chat-footer {
  padding: 12px;
}

.action-icon-btn {
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

.action-icon-btn:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

@media (max-width: 1024px) {
  .chat-panel {
    width: min(340px, calc(100vw - 1rem));
    padding: 12px 12px 12px 0;
  }
}
</style>
