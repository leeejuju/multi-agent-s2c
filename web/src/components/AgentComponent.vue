<template>
  <section class="chat-panel glass-panel rounded-panel">
    <header class="chat-header">
      <h3 class="chat-title">New Chat</h3>
    </header>

    <div ref="messageListRef" class="chat-body">
      <!-- <div v-if="messages.length === 0" class="empty-state">
        <div class="sparkle-icon-container">
          <Sparkles :size="30" class="sparkle-icon" />
        </div>
        <h4 class="welcome-title">Start a conversation</h4>
        <p class="welcome-desc">Ask directly. Keep context minimal, iterate later.</p>

        <div class="suggestion-list">
          <button class="suggestion-item suggestion-blue"
            @click="applySuggestion('Summarize this project in 3 bullets')">
            <div class="suggestion-icon bg-blue">
              <MessageSquare :size="16" />
            </div>
            <span>Summarize the project</span>
          </button>
          <button class="suggestion-item suggestion-orange"
            @click="applySuggestion('Give me one next action for this codebase')">
            <div class="suggestion-icon bg-orange">
              <Zap :size="16" />
            </div>
            <span>One next action</span>
          </button>
        </div>
      </div> -->

      <!-- <template v-else>
        <div v-for="(msg, index) in messages" :key="`${msg.role}-${index}`" class="message-row"
          :class="msg.role === 'user' ? 'message-row-user' : ''">
          <div v-if="msg.role === 'assistant'" class="avatar-container">
            <Sparkles :size="14" />
          </div>
          <div class="message-bubble-wrapper">
            <div class="message-bubble" :class="msg.role === 'assistant' ? 'assistant-bubble' : 'user-bubble'">
              <p>{{ msg.content }}</p>
            </div>
          </div>
        </div>
      </template> -->
    </div>

    <footer class="chat-footer">
      <div class="input-container">
        <div v-if="files.length > 0" class="attachment-strip">
          <div v-for="(file, index) in files" :key="fileKey(file, index)" class="attachment-item">
            <img v-if="isImageFile(file)" :src="previewMap[fileKey(file, index)]" :alt="file.name"
              class="attachment-thumb" />
            <div v-else class="attachment-file-fallback">
              <Paperclip :size="12" />
            </div>
            <button type="button" class="attachment-remove-btn" @click="removeFile(index)">x</button>
          </div>
        </div>

        <textarea ref="textareaRef" v-model="inputText" class="chat-textarea" placeholder="let's design" rows="2"
          @input="autoResize" @keydown="onInputKeydown" />

        <div class="input-actions-bar">
          <div class="left-actions">
            <input ref="fileInputRef" type="file" class="hidden-file-input" multiple @change="onFileChange" />
            <button type="button" class="action-btn" title="Add files" @click="pickFiles">
              <Paperclip :size="16" />
            </button>
          </div>

          <div class="right-actions">
            <div class="model-picker">
              <button type="button" class="action-btn" title="Select model" @click="modelMenuOpen = !modelMenuOpen">
                <SlidersHorizontal :size="16" />
              </button>

              <Transition name="model-pop">
                <div v-if="modelMenuOpen" class="model-popover">
                  <button v-for="model in modelOptions" :key="model" type="button" class="model-pill"
                    :class="selectedModel === model ? 'model-pill-active' : ''"
                    @click="selectedModel = model; modelMenuOpen = false">
                    <span class="model-pill-icon">{{ model.charAt(0) }}</span>
                    <span class="model-pill-name">{{ model }}</span>
                    <span class="model-pill-check" :class="selectedModel === model ? 'is-checked' : ''">
                      <Check :size="12" />
                    </span>
                  </button>
                </div>
              </Transition>
            </div>

            <button type="button" class="send-btn" :class="inputText.trim() && !sending ? 'send-btn-active' : ''"
              :disabled="!inputText.trim() || sending" @click="sendMessage">
              <ArrowUp :size="18" :stroke-width="2.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  ArrowUp,
  Check,
  MessageSquare,
  Paperclip,

  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-vue-next";
import { agentApi } from "@/api/agent";

// type ChatMessage = {
//   role: "user" | "assistant";
//   content: string;
// };

const agentId = "default";
const modelOptions = ["Gemini", "GPT-4o", "Claude 3.7"];

// const messages = ref<ChatMessage[]>([]);
const inputText = ref("");
const sending = ref(false);
const selectedModel = ref(modelOptions[0]);
const modelMenuOpen = ref(false);

const messageListRef = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const files = ref<File[]>([]);
const previewMap = ref<Record<string, string>>({});

const fileKey = (file: File, index: number) =>
  `${file.name}-${file.size}-${file.lastModified}-${index}`;
const isImageFile = (file: File) => file.type.startsWith("image/");

const applySuggestion = (text: string) => {
  inputText.value = text;
  textareaRef.value?.focus();
};

const autoResize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
};

const scrollToBottom = async () => {
  await nextTick();
  const el = messageListRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
};

const pickFiles = () => {
  fileInputRef.value?.click();
};

const onFileChange = (event: Event) => {
  console.log("文件变动");

  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  files.value.push(...Array.from(input.files));
  input.value = "";
};

const removeFile = (index: number) => {
  files.value.splice(index, 1);
};

watch(
  files,
  (nextFiles) => {
    const nextMap: Record<string, string> = {};
    nextFiles.forEach((file, index) => {
      if (!isImageFile(file)) return;
      nextMap[fileKey(file, index)] = URL.createObjectURL(file);
    });
    Object.values(previewMap.value).forEach((url) => URL.revokeObjectURL(url));
    previewMap.value = nextMap;
  },
  { deep: true },
);

onBeforeUnmount(() => {
  Object.values(previewMap.value).forEach((url) => URL.revokeObjectURL(url));
});

const sendMessage = async () => {
  console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.log(inputText.value);
  console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");

  const text = inputText.value.trim();
  if (!text || sending.value) return;

  // const userMessage: ChatMessage = { role: "user", content: text };
  // messages.value.push(userMessage);
  // inputText.value = "";
  // files.value = [];
  // autoResize();
  // await scrollToBottom();

  // sending.value = true;
  // modelMenuOpen.value = false;

  // try {
  //   const response = await agentApi.send2Agent(
  //     agentId,
  //     { messages: messages.value },
  //     { model: selectedModel.value, stream: false },
  //   );

  //   messages.value.push({
  //     role: "assistant",
  //     content: response.content || "No response",
  //   });
  // } catch {
  //   messages.value.push({
  //     role: "assistant",
  //     content: "Request failed. Check server and try again.",
  //   });
  // } 
  // finally {
  //   sending.value = false;
  //   await scrollToBottom();
  // }
};

const onInputKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
};
</script>
<style scoped>
@reference "tailwindcss";

.chat-panel {
  @apply pointer-events-auto my-4 mr-4 ml-0 flex h-[calc(100%-2rem)] w-[340px] flex-col overflow-hidden;
}

@media (min-width: 1280px) {
  .chat-panel {
    width: 400px;
  }
}

.chat-header {
  @apply px-5 py-4;
}

.chat-title {
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
  color: #0f172a;
}

.chat-body {
  @apply flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4;
}

.empty-state {
  @apply flex h-full flex-1 flex-col items-center justify-center text-center;
}

.sparkle-icon-container {
  @apply mb-5 flex h-14 w-14 items-center justify-center rounded-full;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(251, 146, 60, 0.1));
}

.sparkle-icon {
  color: #334155;
}

.welcome-title {
  @apply mb-1;
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
  color: #0f172a;
}

.welcome-desc {
  @apply mb-6;
  font-size: 13px;
  line-height: 18px;
  color: #888888;
}

.suggestion-list {
  @apply flex w-full max-w-[300px] flex-col gap-3;
}

.suggestion-item {
  @apply flex w-full cursor-pointer items-center gap-3 rounded-[16px] border border-[#d7dee8] bg-[#f4f7fb] px-4 py-3 text-left text-slate-600 transition-all duration-200 hover:bg-white;
  font-size: 14px;
  line-height: 18px;
}

.suggestion-blue:hover {
  @apply border-blue-500 text-blue-600;
}

.suggestion-orange:hover {
  @apply border-orange-500 text-orange-600;
}

.suggestion-icon {
  @apply flex h-7 w-7 items-center justify-center rounded-lg;
}

.suggestion-icon.bg-blue {
  @apply bg-blue-500/10 text-blue-500;
}

.suggestion-icon.bg-orange {
  @apply bg-orange-500/10 text-orange-500;
}

.message-row {
  @apply flex gap-3;
}

.message-row-user {
  @apply flex-row-reverse;
}

.avatar-container {
  @apply mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#d7dee8] bg-white text-slate-600;
}

.message-bubble-wrapper {
  @apply max-w-[78%];
}

.message-bubble {
  @apply rounded-[16px] px-3.5 py-2.5;
  font-size: 14px;
  line-height: 19px;
}

.assistant-bubble {
  @apply rounded-tl-[4px] border border-[#d7dee8] bg-white text-slate-900;
}

.user-bubble {
  @apply rounded-tr-[4px] bg-slate-800 text-white;
}

.chat-footer {
  @apply px-1.5 pb-1.5;
}

.input-container {
  @apply flex flex-col overflow-hidden rounded-[24px] border border-[#d7dee8] bg-[#f4f7fb];
}

.attachment-strip {
  @apply mt-2 flex max-h-[62px] min-h-[48px] gap-2 overflow-x-auto px-2;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.attachment-strip::-webkit-scrollbar {
  display: none;
}

.attachment-item {
  @apply relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[#d7dee8] bg-white;
}

.attachment-thumb {
  @apply h-full w-full object-cover;
}

.attachment-file-fallback {
  @apply flex h-full w-full items-center justify-center text-slate-500;
}

.attachment-remove-btn {
  @apply absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] text-white;
}


.chat-textarea {
  @apply m-1 mb-1 flex-1 mx-0 resize-none self-stretch border-0 bg-transparent px-3 pt-3 text-slate-900 outline-none;
  font-size: 15px;
  line-height: 20px;
  font-weight: 400;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-textarea::-webkit-scrollbar {
  display: none;
}

.input-actions-bar {
  @apply flex items-center justify-between px-3 pb-3 pt-2;
}

.left-actions {
  @apply flex items-center gap-2;
}

.right-actions {
  @apply relative flex items-center gap-2;
}

.hidden-file-input {
  display: none;
}

.action-btn {
  @apply flex h-8 w-8 items-center justify-center rounded-full border border-[#b9c6d6] text-slate-500 transition-colors duration-200 hover:bg-[#eef2f8] hover:text-slate-900;
}

.send-btn {
  @apply flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2f8] text-slate-400 transition-all duration-200;
}

.send-btn-active {
  @apply bg-zinc-900 text-white hover:bg-black;
}

.model-picker {
  @apply relative;
}

.model-popover {
  @apply absolute bottom-10 right-0 z-20 flex min-w-[220px] flex-col gap-2 rounded-2xl border border-[#d7dee8] bg-white p-2;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
}

.model-pill {
  @apply flex w-full items-center gap-2 rounded-full border border-[#d5deea] bg-[#f4f7fb] px-2.5 py-1.5 text-slate-600 transition-all duration-200 hover:border-slate-500 hover:bg-white;
  font-size: 12px;
  line-height: 16px;
}

.model-pill-active {
  @apply border-slate-900 bg-slate-900 text-white;
}

.model-pill-icon {
  @apply flex h-4 w-4 items-center justify-center rounded-full bg-white/85 text-[10px] font-semibold text-slate-700;
}

.model-pill-name {
  @apply flex-1;
}

.model-pill-check {
  @apply flex h-4 w-4 items-center justify-center rounded-full border border-[#cfd8e3] text-transparent;
}

.model-pill-check.is-checked {
  @apply border-white/70 bg-white/20 text-white;
}

.model-pop-enter-active,
.model-pop-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.model-pop-enter-from,
.model-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
</style>
