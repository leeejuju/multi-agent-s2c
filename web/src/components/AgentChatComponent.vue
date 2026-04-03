<template>
  <aside class="chat-panel">
    <div class="chat-shell">
      <header class="chat-header">
        <h1 class="chat-title">s2c</h1>
      </header>

      <section class="chat-body">
        <div v-if="statusText && !isSending" class="status-banner" :class="{ 'is-error': statusType === 'error' }">
          {{ statusText }}
        </div>

        <div v-if="messages.length === 0" class="empty-state">
          发送文本，或先上传图片和文档再发起对话。
        </div>

        <div v-else class="message-list">
          <div v-for="(message, index) in messages" :key="`${message.role}-${index}`" class="message-item"
            :class="message.role === 'user' ? 'is-user' : 'is-assistant'">
            <div v-if="message.loading" class="message-loading" aria-label="消息生成中">
              <span class="loading-line line-1" />
              <span class="loading-line line-2" />
              <span class="loading-line line-3" />
            </div>

            <div v-else-if="message.content" class="message-content">
              {{ message.content }}
            </div>

            <div v-if="message.images?.length || message.attachments?.length" class="message-assets">
              <div v-if="message.images?.length" class="message-image-grid">
                <div v-for="image in message.images" :key="image.id" class="message-image-card">
                  <img :src="image.src" :alt="image.fileName || 'image'" class="message-image" />
                  <span class="message-image-label">{{ image.fileName || "图片" }}</span>
                </div>
              </div>

              <div v-if="message.attachments?.length" class="message-file-list">
                <div v-for="attachment in message.attachments" :key="attachment.id" class="message-file-chip">
                  <span class="message-file-name">{{ attachment.file_name || attachment.name || "附件" }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer class="chat-footer">
        <AgentMessageInputArea :text="draftText" :images="draftImages" :attachments="draftAttachments"
          :selected-model-id="selectedModelId" :disabled="isUploading || isSending" @update:text="handleUpdateText"
          @send="handleSend" @click-attachment="triggerFileInput" @remove-image="handleRemoveImage"
          @remove-attachment="handleRemoveAttachment">
          <template #actions-left>
            <label class="attachment-upload-trigger">
              <input ref="fileInputRef" type="file" multiple :accept="acceptTypes" style="display: none"
                @change="handleFileChange" />
              <button type="button" class="action-icon-btn" :disabled="isUploading || isSending"
                @click="triggerFileInput">
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
import { agentApi, type AttachmentItem } from "@/api/agent"

const DEFAULT_AGENT_ID = "DesignAgent"
const acceptTypes = "image/*,.pdf,.txt,.md,.markdown,.json,.docx"
const fileInputRef = ref<HTMLInputElement | null>(null)

type DraftImage = {
  id: string
  src: string
  fileName: string
  uploading?: boolean
  attachment?: AttachmentItem
}

type DraftAttachment = AttachmentItem & {
  uploading?: boolean
  name?: string
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  images?: DraftImage[]
  attachments?: DraftAttachment[]
  loading?: boolean
}

const draftText = ref("")
const draftImages = ref<DraftImage[]>([])
const draftAttachments = ref<DraftAttachment[]>([])
const messages = ref<ChatMessage[]>([])
const selectedModelId = ref("gpt-4o")
const conversationId = ref<string | null>(null)
const isUploading = ref(false)
const isSending = ref(false)
const statusText = ref("")
const statusType = ref<"info" | "error">("info")

const imageExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "svg",
])

const documentExtensions = new Set([
  "pdf",
  "txt",
  "md",
  "markdown",
  "json",
  "docx",
])

const getExtension = (file: File) => {
  const extension = file.name.split(".").pop()
  return extension ? extension.toLowerCase() : ""
}

const isImageFile = (file: File) =>
  file.type.startsWith("image/") || imageExtensions.has(getExtension(file))

const isDocumentFile = (file: File) =>
  documentExtensions.has(getExtension(file)) ||
  [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(file.type)

const buildPayloadAttachments = (
  images: DraftImage[] = draftImages.value,
  attachments: DraftAttachment[] = draftAttachments.value,
) => [
  ...images
    .filter((image) => !image.uploading && image.attachment)
    .map((image) => image.attachment as AttachmentItem),
  ...attachments.filter((attachment) => !attachment.uploading),
]

const cloneDraftImages = (images: DraftImage[]) =>
  images.map((image) => ({
    ...image,
    attachment: image.attachment ? { ...image.attachment } : undefined,
  }))

const cloneDraftAttachments = (attachments: DraftAttachment[]) =>
  attachments.map((attachment) => ({ ...attachment }))

const clearDraftState = () => {
  draftText.value = ""
  draftImages.value = []
  draftAttachments.value = []
}

const restoreDraftState = (
  text: string,
  images: DraftImage[],
  attachments: DraftAttachment[],
) => {
  draftText.value = text
  draftImages.value = images
  draftAttachments.value = attachments
}

const handleUpdateText = (val: string) => {
  draftText.value = val
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

const createPendingImage = (file: File): DraftImage => ({
  id: `pending-image-${crypto.randomUUID()}`,
  src: URL.createObjectURL(file),
  fileName: file.name,
  uploading: true,
})

const createPendingAttachment = (file: File): DraftAttachment => ({
  id: `pending-file-${crypto.randomUUID()}`,
  file_name: file.name,
  content_type: file.type || "application/octet-stream",
  file_size: file.size,
  object_key: "",
  category: "document",
  access_url: "",
  uploading: true,
  name: file.name,
})

const clearPendingImages = (pendingIds: string[]) => {
  const pendingIdSet = new Set(pendingIds)
  const pendingImages = draftImages.value.filter((image) => pendingIdSet.has(image.id))
  pendingImages.forEach((image) => {
    if (image.src.startsWith("blob:")) {
      URL.revokeObjectURL(image.src)
    }
  })
  draftImages.value = draftImages.value.filter((image) => !pendingIdSet.has(image.id))
}

const clearPendingAttachments = (pendingIds: string[]) => {
  const pendingIdSet = new Set(pendingIds)
  draftAttachments.value = draftAttachments.value.filter(
    (attachment) => !pendingIdSet.has(attachment.id),
  )
}

const appendUploadedImages = (uploadedImages: AttachmentItem[]) => {
  draftImages.value = [
    ...draftImages.value,
    ...uploadedImages.map((image) => ({
      id: image.id,
      src: image.thumb_url || image.access_url,
      fileName: image.file_name,
      attachment: image,
    })),
  ]
}

const appendUploadedDocuments = (uploadedDocuments: AttachmentItem[]) => {
  draftAttachments.value = [...draftAttachments.value, ...uploadedDocuments]
}

const handleUploadFiles = async (files: File[]) => {
  const imageFiles = files.filter(isImageFile)
  const documentFiles = files.filter(
    (file) => !isImageFile(file) && isDocumentFile(file),
  )
  const unsupportedFiles = files.filter(
    (file) => !isImageFile(file) && !isDocumentFile(file),
  )

  if (unsupportedFiles.length > 0) {
    setStatus(
      `存在不支持的文件类型：${unsupportedFiles.map((file) => file.name).join("、")}`,
      "error",
    )
    return
  }

  if (imageFiles.length === 0 && documentFiles.length === 0) {
    return
  }

  const pendingImages = imageFiles.map(createPendingImage)
  const pendingAttachments = documentFiles.map(createPendingAttachment)

  draftImages.value = [...draftImages.value, ...pendingImages]
  draftAttachments.value = [...draftAttachments.value, ...pendingAttachments]
  isUploading.value = true
  setStatus("")

  try {
    const results = await Promise.allSettled([
      imageFiles.length > 0
        ? agentApi.uploadImages(imageFiles, conversationId.value || undefined)
        : Promise.resolve([]),
      documentFiles.length > 0
        ? agentApi.uploadFiles(documentFiles, conversationId.value || undefined)
        : Promise.resolve([]),
    ])

    clearPendingImages(pendingImages.map((image) => image.id))
    clearPendingAttachments(pendingAttachments.map((attachment) => attachment.id))

    const [imageResult, documentResult] = results
    const uploadErrors: string[] = []

    if (imageResult.status === "fulfilled") {
      appendUploadedImages(imageResult.value)
    } else if (imageFiles.length > 0) {
      uploadErrors.push(
        `图片上传失败：${imageResult.reason instanceof Error ? imageResult.reason.message : "未知错误"}`,
      )
    }

    if (documentResult.status === "fulfilled") {
      appendUploadedDocuments(documentResult.value)
    } else if (documentFiles.length > 0) {
      uploadErrors.push(
        `文件上传失败：${documentResult.reason instanceof Error ? documentResult.reason.message : "未知错误"}`,
      )
    }

    if (uploadErrors.length > 0) {
      setStatus(uploadErrors.join("；"), "error")
      return
    }

    setStatus("")
  } finally {
    isUploading.value = false
  }
}

const handleRemoveImage = (index: number) => {
  const removedImage = draftImages.value[index]
  if (removedImage?.src.startsWith("blob:")) {
    URL.revokeObjectURL(removedImage.src)
  }
  draftImages.value = draftImages.value.filter(
    (_, currentIndex) => currentIndex !== index,
  )
}

const handleRemoveAttachment = (index: number) => {
  draftAttachments.value = draftAttachments.value.filter(
    (_, currentIndex) => currentIndex !== index,
  )
}

const handleSend = async () => {
  const trimmedText = draftText.value.trim()
  if (isUploading.value || isSending.value) {
    return
  }

  if (
    !trimmedText &&
    draftImages.value.length === 0 &&
    draftAttachments.value.length === 0
  ) {
    return
  }

  const messageImages = cloneDraftImages(draftImages.value)
  const messageAttachments = cloneDraftAttachments(draftAttachments.value)
  const payloadAttachments = buildPayloadAttachments(messageImages, messageAttachments)

  const userMessage: ChatMessage = {
    role: "user",
    content: trimmedText,
    images: messageImages,
    attachments: messageAttachments,
  }
  messages.value.push(userMessage)
  messages.value.push({
    role: "assistant",
    content: "",
    loading: true,
  })
  clearDraftState()

  isSending.value = true
  setStatus("消息发送中...")

  try {
    const response = await agentApi.send2Agent(
      DEFAULT_AGENT_ID,
      {
        input: trimmedText,
        conversation_id: conversationId.value || undefined,
        attachments: payloadAttachments,
      },
      {
        model: selectedModelId.value,
        stream: false,
      },
    )

    if (response.conversation_id) {
      conversationId.value = response.conversation_id
    }

    if (messages.value[messages.value.length - 1]?.loading) {
      messages.value.pop()
    }
    messages.value.push({
      role: "assistant",
      content: response.content || "已收到请求，但暂未返回内容。",
    })
    setStatus("")
  } catch (error) {
    messages.value.pop()
    messages.value.pop()
    restoreDraftState(trimmedText, messageImages, messageAttachments)
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
  width: min(456px, calc(100vw - 2rem));
  justify-content: flex-end;
  align-items: center;
  padding: 18px 18px 18px 0;
  pointer-events: none;
}

.chat-shell {
  position: relative;
  isolation: isolate;
  pointer-events: auto;
  display: flex;
  height: calc(100% - 36px);
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9)),
    rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(22px);
  box-shadow:
    0 28px 72px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.chat-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.92), transparent 34%),
    radial-gradient(circle at bottom right, rgba(191, 219, 254, 0.18), transparent 30%);
  pointer-events: none;
}

.chat-header {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.4));
}

.chat-title {
  margin: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: #0f172a;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px 14px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.chat-body::-webkit-scrollbar {
  width: 6px;
}

.chat-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.42);
}

.status-banner {
  margin: 0 6px 16px 0;
  border: 1px solid rgba(191, 219, 254, 0.8);
  border-radius: 16px;
  background: rgba(239, 246, 255, 0.84);
  color: #1d4ed8;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.01em;
  backdrop-filter: blur(12px);
}

.status-banner.is-error {
  border-color: rgba(254, 202, 202, 0.9);
  background: rgba(254, 242, 242, 0.92);
  color: #b91c1c;
}

.empty-state {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 26px 56px;
  text-align: center;
  color: #526173;
  font-size: 14px;
  line-height: 1.8;
}

.empty-state::before {
  content: "";
  width: 54px;
  height: 54px;
  margin-bottom: 18px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 245, 249, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 12px 28px rgba(148, 163, 184, 0.12);
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-right: 6px;
}

.message-item {
  position: relative;
  max-width: 100%;
  padding: 0;
  font-size: 14px;
  line-height: 1.72;
  white-space: pre-wrap;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-loading {
  position: relative;
  display: flex;
  width: min(100%, 380px);
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 4px 0;
}

.message-loading::after {
  content: "";
  position: absolute;
  inset: -30% -45%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0) 28%,
    rgba(255, 255, 255, 0.92) 48%,
    rgba(255, 255, 255, 0) 68%
  );
  animation: messageShimmer 1.8s ease-in-out infinite;
}

.loading-line {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.9), rgba(241, 245, 249, 0.95));
}

.loading-line.line-1 {
  width: 92%;
}

.loading-line.line-2 {
  width: 78%;
}

.loading-line.line-3 {
  width: 56%;
}

.message-assets {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.message-image-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.message-image-card {
  overflow: hidden;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.14);
}

.message-image {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.message-image-label {
  display: block;
  padding: 8px 10px 10px;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.message-file-chip {
  max-width: 100%;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  line-height: 1.4;
}

.message-file-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-user {
  align-self: flex-end;
  width: min(100%, 86%);
  color: #0f172a;
  text-align: right;
}

.is-user .message-image-card,
.is-user .message-file-chip {
  border: 1px solid rgba(226, 232, 240, 0.94);
  background: rgba(248, 250, 252, 0.96);
}

.is-user .message-assets {
  align-items: flex-end;
}

.is-user .message-file-list {
  justify-content: flex-end;
}

.is-user .message-image-label,
.is-user .message-file-name {
  color: #334155;
}

.is-assistant {
  align-self: flex-start;
  width: min(100%, 86%);
  color: #0f172a;
}

.is-assistant .message-image-card,
.is-assistant .message-file-chip {
  border: 1px solid rgba(226, 232, 240, 0.94);
  background: rgba(248, 250, 252, 0.96);
}

.is-assistant .message-image-label,
.is-assistant .message-file-name {
  color: #334155;
}

@keyframes messageShimmer {
  0% {
    transform: translate3d(-28%, -22%, 0);
  }

  100% {
    transform: translate3d(28%, 22%, 0);
  }
}

.chat-footer {
  padding: 8px 10px 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.7));
}

.action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(248, 250, 252, 0.94);
  color: #475569;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.action-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.action-icon-btn:not(:disabled):hover {
  border-color: rgba(148, 163, 184, 0.5);
  background: #ffffff;
  color: #0f172a;
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 10px 22px rgba(148, 163, 184, 0.18);
}

@media (max-width: 1024px) {
  .chat-panel {
    width: min(352px, calc(100vw - 1rem));
    padding: 12px 12px 12px 0;
  }

  .chat-shell {
    height: calc(100% - 24px);
    border-radius: 28px;
  }

  .chat-header {
    padding: 20px 18px 16px;
  }

  .chat-title {
    font-size: 24px;
  }

  .chat-body {
    padding: 18px 12px 12px 18px;
  }
}

@media (max-width: 768px) {
  .chat-panel {
    width: min(100%, calc(100vw - 0.75rem));
    padding: 8px 8px 8px 0;
  }

  .message-item {
    max-width: 90%;
  }
}
</style>
