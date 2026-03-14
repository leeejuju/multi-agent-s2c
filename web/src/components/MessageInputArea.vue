// TODO 想太多了，遵循第一性的原理，初始阶段，不要想那么多没几把用的，直接写一整个
<!-- <template>
  <footer class="chat-footer">
    <div class="input-container">
      <div v-if="files.length > 0" class="attachment-strip">
        <div v-for="(file, index) in files" :key="fileKey(file, index)" class="attachment-item">
          <img v-if="isImageFile(file)" :src="previewMap[fileKey(file, index)]" :alt="file.name"
            class="attachment-thumb" />
          <div v-else class="attachment-file-fallback">
            <Paperclip :size="12" />
          </div>
          <button type="button" class="attachment-remove-btn" @click="removeFile(index)">×</button>
        </div>
      </div>

      <textarea v-model="inputText" class="chat-textarea" placeholder="Message AI Assistant..." rows="2"
        @input="autoResize"></textarea>

      <div class="input-actions-bar">
        <div class="left-actions">
          <input ref="fileInput" type="file" class="hidden" multiple @change="onFileChange" />
          <div class="action-btn" title="Add files" @click="pickFiles">
            <slot name="attachment" v-bind="{ files, pickFiles, removeFile }">
              <Paperclip :size="18" />
            </slot>
          </div>
        </div>

        <div class="right-actions">
          <div class="model-picker">
            <button class="model-trigger" type="button" @click="toggleModelMenu">
              <SlidersHorizontal :size="16" />
            </button>

            <Transition name="model-pop">
              <div v-if="modelMenuOpen" class="model-popover">
                <button v-for="model in modelOptions" :key="model" type="button" class="model-pill"
                  :class="selectedModel === model ? 'model-pill-active' : ''" @click="pickModel(model)">
                  <span class="model-pill-icon">{{ model.charAt(0) }}</span>
                  <span class="model-pill-name">{{ model }}</span>
                  <span class="model-pill-check" :class="selectedModel === model ? 'is-checked' : ''">
                    <Check :size="12" />
                  </span>
                </button>
              </div>
            </Transition>
          </div>

          <div class="send-btn" :class="inputText.trim() && !sending ? 'send-btn-active' : ''" @click="sendMessage">
            <ArrowUp :size="18" :stroke-width="2.5" />
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>



<script setup lang="ts">
import { ArrowUp, SlidersHorizontal, Check, Paperclip } from "lucide-vue-next"
import { computed, ref, watch } from "vue"

type SendPayload = {
  message: string
  model: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    sending?: boolean
  }>(),
  {
    sending: false,
  },
)

const emit = defineEmits<{
  "update:modelValue": [value: string]
  send: [payload: SendPayload]
}>()

const modelMenuOpen = ref(false)
const selectedModel = ref("Gemini")
const modelOptions = ["Gemini", "GPT-4o", "Claude 3.7"]
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const previewMap = ref<Record<string, string>>({})

const inputText = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
})

const autoResize = (event: Event) => {
  const el = event.target as HTMLTextAreaElement
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

const toggleModelMenu = () => {
  modelMenuOpen.value = !modelMenuOpen.value
}

const pickModel = (model: string) => {
  selectedModel.value = model
  modelMenuOpen.value = false
}

const pickFiles = () => {
  fileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  files.value.push(...Array.from(input.files))
  input.value = ""
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
}

const fileKey = (file: File, index: number) => `${file.name}-${file.size}-${file.lastModified}-${index}`
const isImageFile = (file: File) => file.type.startsWith("image/")

watch(
  files,
  (nextFiles) => {
    const nextMap: Record<string, string> = {}

    nextFiles.forEach((file, index) => {
      if (!isImageFile(file)) return
      const key = fileKey(file, index)
      nextMap[key] = URL.createObjectURL(file)
    })

    Object.values(previewMap.value).forEach((url) => URL.revokeObjectURL(url))
    previewMap.value = nextMap
  },
  { deep: true },
)

const sendMessage = () => {
  const message = inputText.value.trim()
  if (!message || props.sending) return
  emit("send", { message, model: selectedModel.value })
}
</script>

<style scoped>
@reference "tailwindcss";

.chat-footer {
  @apply flex h-[22%] min-h-[140px] flex-col px-2 pb-2;
}

.input-container {
  @apply flex flex-1 flex-col overflow-hidden rounded-[28px] border border-[#d7dee8] bg-[#f4f7fb] duration-200 focus-within:border-slate-500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transition-property: border-color, box-shadow;
  transition-duration: 200ms;
}

.input-container:focus-within {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.chat-textarea {
  @apply m-2 mb-0 flex-1 resize-none self-stretch border-0 bg-transparent px-2 pt-2 text-slate-900 outline-none;
  font-size: 16px;
  line-height: 20px;
  font-weight: 400;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-textarea::-webkit-scrollbar {
  display: none;
}

.attachment-strip {
  @apply mt-2 flex max-h-[64px] min-h-[50px] gap-2 overflow-x-auto px-2;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.attachment-strip::-webkit-scrollbar {
  display: none;
}

.attachment-item {
  @apply relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[#d5deea] bg-white;
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

.input-actions-bar {
  @apply flex items-center justify-between px-3 pb-3 pt-2;
}

.left-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#b9c6d6] text-slate-500 transition-all duration-200 hover:bg-[#eef2f8] hover:text-slate-900;
}

.right-actions {
  @apply relative flex items-center gap-2;
}

.send-btn {
  @apply flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#eef2f8] text-slate-400 transition-all duration-200;
}

.send-btn-active {
  @apply bg-zinc-900 text-white hover:-translate-y-0.5 hover:bg-black;
}

.model-picker {
  @apply relative;
}

.model-trigger {
  @apply flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#b9c6d6] text-slate-500 transition-all duration-200 hover:bg-[#eef2f8] hover:text-slate-900;
}

.model-popover {
  @apply absolute bottom-10 right-0 z-20 flex min-w-[210px] flex-col gap-2 rounded-2xl border border-[#d7dee8] bg-white p-2 shadow-xl;
}

.model-pill {
  @apply flex w-full items-center gap-2 rounded-full border border-[#d5deea] bg-[#f4f7fb] px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-all duration-200 hover:border-slate-500 hover:bg-white;
}

.model-pill-active {
  @apply border-slate-900 bg-slate-900 text-white;
}

.model-pill-icon {
  @apply flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-[10px] font-semibold text-slate-700;
}

.model-pill-name {
  @apply text-[12px] font-medium;
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
</style> -->
