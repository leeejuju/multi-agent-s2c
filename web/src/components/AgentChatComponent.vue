<template>
  <aside class="chat-panel">
    <div class="chat-shell">
      <header class="chat-header">
        <h1 class="chat-title">对话面板</h1>
      </header>

      <section class="chat-body">
        <div v-if="messages.length === 0" class="empty-state">
        </div>

        <div v-else class="message-list">
          <div v-for="(message, index) in messages" :key="`${message.role}-${index}`" class="message-item"
            :class="message.role === 'user' ? 'is-user' : 'is-assistant'">
            {{ message.content }}
          </div>
        </div>
      </section>

      <footer class="chat-footer">
        <AgentMessageInputArea v-model="userInput" @send="handleSend">
          <template #attachmentOption>
            <AttachmentPart />
          </template>

          <template #imagePreview>
            <div v-if="previewImage" class="preview-wrapper">
              <ImagePreviewPart :ImageData="previewImage" @remove-image="previewImage = null" />
            </div>
          </template>
        </AgentMessageInputArea>
      </footer>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue"
import AgentMessageInputArea from "./AgentMessageInputArea.vue"
import ImagePreviewPart from "./ImagePreviewPart.vue"
import AttachmentPart from "./AttachmentPart.vue"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const userInput = ref("")
const previewImage = ref<{ slot: string } | null>(null)
const messages = ref<ChatMessage[]>([])

const handleSend = (text: string) => {
  messages.value.push({
    role: "user",
    content: text,
  })
}
</script>

<style scoped>
.chat-panel {
  position: relative;
  display: flex;
  height: 100%;
  width: min(360px, calc(100vw - 2rem));
  justify-content: flex-end;
  padding: 16px 16px 16px 0;
  pointer-events: none;
}

.chat-shell {
  pointer-events: auto;
  display: flex;
  height: 100%;
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

.chat-eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
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

.empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.empty-text {
  margin: 0;
  max-width: 220px;
  font-size: 14px;
  line-height: 1.6;
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
  border-top: 1px solid rgba(215, 222, 232, 0.9);
  padding: 16px;
}

.preview-wrapper {
  position: relative;
  height: 96px;
  width: 96px;
  overflow: hidden;
  border-radius: 16px;
}

@media (max-width: 1024px) {
  .chat-panel {
    width: min(340px, calc(100vw - 1rem));
    padding: 12px 12px 12px 0;
  }
}
</style>
