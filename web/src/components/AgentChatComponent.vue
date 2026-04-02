<template>
  <aside class="chat-panel">
    <div class="chat-shell">
      <header class="chat-header">
        <h1 class="chat-title">智能体对话</h1>
      </header>

      <section class="chat-body">
        <div
          v-if="statusText"
          class="status-banner"
          :class="{ 'is-error': statusType === 'error' }"
        >
          {{ statusText }}
        </div>

        <div v-if="messages.length === 0" class="empty-state">
          发送文本或上传图片后发起一次对话。
        </div>

        <div v-else class="message-list">
          <div
            v-for="(message, index) in messages"
            :key="`${message.role}-${index}`"
            class="message-item"
            :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
          >
            <div class="message-content">
              <span v-if="message.images?.length" class="message-meta">[图片]</span>
              <span v-if="message.attachments?.length" class="message-meta">[附件]</span>
              {{ message.content || " " }}
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
          :disabled="isUploading || isSending"
          @update:text="handleUpdateText"
          @send="handleSend"
          @click-attachment="triggerFileInput"
          @remove-image="handleRemoveImage"
          @remove-attachment="handleRemoveAttachment"
        >
          <template #actions-left>
            <label class="attachment-upload-trigger">
              <input
                ref="fileInputRef"
                type="file"
                multiple
                :accept="acceptTypes"
                style="display: none"
                @change="handleFileChange"
              />
              <button
                type="button"
                class="action-icon-btn"
                :disabled="isUploading || isSending"
                @click="triggerFileInput"
              >
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
import { agentApi } from "@/api/agent"
import { fileApi, type AttachmentItem } from "@/api/file"

const DEFAULT_AGENT_ID = "DesignAgent"
const acceptTypes = "image/*"
const fileInputRef = ref<HTMLInputElement | null>(null)

type DraftImage = {
  src: string
  fileName: string
  attachment: AttachmentItem
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  images?: DraftImage[]
  attachments?: AttachmentItem[]
}

const draftText = ref("")
const draftImages = ref<DraftImage[]>([])
const draftAttachments = ref<AttachmentItem[]>([])
const messages = ref<ChatMessage[]>([])
const selectedModelId = ref("gpt-4o")
const conversationId = ref<string | null>(null)
const isUploading = ref(false)
const isSending = ref(false)
const statusText = ref("")
const statusType = ref<"info" | "error">("info")

const handleUpdateText = (val: string) => {
  draftText.value = val
}

const handleUpdateModelId = (id: string) => {
  selectedModelId.value = id
}

const setStatus = (text = "", type: "info" | "error" = "info") => {
  statusText.value = text
  statusType.value = type
}

const triggerFileInput = () => {
  if (isUploading.value || isSending.value) {
    return
  }
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) {
    return
  }

  const selectedFiles = Array.from(target.files)
  target.value = ""
  await handleUploadFiles(selectedFiles)
}

const handleUploadFiles = async (files: File[]) => {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"))
  if (imageFiles.length === 0) {
    setStatus("暂时只支持上传图片。", "error")
    return
  }

  isUploading.value = true
  setStatus("图片上传中，请等待上传完成后再发送。")

  try {
    const uploadedImages = await fileApi.uploadImages(
      imageFiles,
      conversationId.value || undefined,
    )

    draftImages.value = [
      ...draftImages.value,
      ...uploadedImages.map((image) => ({
        src: image.access_url,
        fileName: image.file_name,
        attachment: image,
      })),
    ]
    draftAttachments.value = [...draftAttachments.value, ...uploadedImages]
    setStatus("图片上传完成，可以发送。")
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片上传失败。"
    setStatus(message, "error")
  } finally {
    isUploading.value = false
  }
}

const handleRemoveImage = (index: number) => {
  draftImages.value = draftImages.value.filter((_, currentIndex) => currentIndex !== index)
  draftAttachments.value = draftAttachments.value.filter(
    (_, currentIndex) => currentIndex !== index,
  )
}

const handleRemoveAttachment = (index: number) => {
  draftAttachments.value = draftAttachments.value.filter(
    (_, currentIndex) => currentIndex !== index,
  )
  draftImages.value = draftImages.value.filter((_, currentIndex) => currentIndex !== index)
}

const resetDraft = () => {
  draftText.value = ""
  draftImages.value = []
  draftAttachments.value = []
}

const handleSend = async () => {
  const trimmedText = draftText.value.trim()
  if (isUploading.value || isSending.value) {
    return
  }

  if (!trimmedText && draftImages.value.length === 0) {
    return
  }

  const userMessage: ChatMessage = {
    role: "user",
    content: trimmedText,
    images: [...draftImages.value],
    attachments: [...draftAttachments.value],
  }
  messages.value.push(userMessage)

  isSending.value = true
  setStatus("消息发送中...")

  try {
    const response = await agentApi.send2Agent(
      DEFAULT_AGENT_ID,
      {
        input: trimmedText,
        conversation_id: conversationId.value || undefined,
        attachments: draftAttachments.value,
      },
      {
        model: selectedModelId.value,
        stream: false,
      },
    )

    if (response.conversation_id) {
      conversationId.value = response.conversation_id
    }

    messages.value.push({
      role: "assistant",
      content: response.content || "已收到请求，但暂未返回内容。",
    })
    resetDraft()
    setStatus("")
  } catch (error) {
    messages.value.pop()
    const message = error instanceof Error ? error.message : "消息发送失败。"
    setStatus(message, "error")
  } finally {
    isSending.value = false
  }
}
</script>

<style scoped>
.chat-panel {
  position: relative;
  display: flex;
  height: 100%;
  width: min(440px, calc(100vw - 2rem));
  justify-content: flex-end;
  align-items: center;
  padding: 16px 16px 16px 0;
  pointer-events: none;
}

.chat-shell {
  pointer-events: auto;
  display: flex;
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

.status-banner {
  margin-bottom: 12px;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 10px 12px;
  font-size: 13px;
}

.status-banner.is-error {
  background: #fef2f2;
  color: #b91c1c;
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
  margin-right: 6px;
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
  background: #f1f5f9; /* 淡灰色 */
  color: #64748b;
  border-radius: 50%; /* 圆形 */
  cursor: pointer;
  transition: all 0.2s;
}

.action-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.action-icon-btn:not(:disabled):hover {
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
