<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { MessageSquare, Search } from "@lucide/vue"

import ModalSurface from "@/components/ui/ModalSurface.vue"
import type { PrototypeConversation } from "@/types/prototype"

const props = defineProps<{
  open: boolean
  conversations: PrototypeConversation[]
}>()

const emit = defineEmits<{
  close: []
  select: [conversationId: string]
}>()

const query = ref("")
const input = ref<HTMLInputElement | null>(null)

const results = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase()
  if (!normalized) return props.conversations
  return props.conversations.filter((conversation) =>
    conversation.title.toLocaleLowerCase().includes(normalized)
  )
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    query.value = ""
    await nextTick()
    input.value?.focus()
  }
)

const selectConversation = (conversationId: string) => {
  emit("select", conversationId)
  emit("close")
}
</script>

<template>
  <ModalSurface
    :open="open"
    title="搜索对话"
    description="只搜索你在本地预览中创建的内容"
    @close="$emit('close')"
  >
    <label class="search-field">
      <Search :size="18" :stroke-width="1.9" aria-hidden="true" />
      <span class="sr-only">搜索关键词</span>
      <input
        ref="input"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="输入对话标题"
      >
    </label>

    <div class="search-results" aria-live="polite">
      <button
        v-for="conversation in results"
        :key="conversation.id"
        class="search-result"
        type="button"
        @click="selectConversation(conversation.id)"
      >
        <MessageSquare :size="17" :stroke-width="1.8" />
        <span>{{ conversation.title }}</span>
      </button>

      <div v-if="results.length === 0" class="search-empty">
        <p>{{ conversations.length === 0 ? "暂无对话" : "没有匹配的对话" }}</p>
        <span>开始一次本地对话后，它会出现在这里。</span>
      </div>
    </div>
  </ModalSurface>
</template>

<style scoped>
.search-field {
  display: flex;
  height: 48px;
  padding: 0 15px;
  align-items: center;
  gap: 11px;
  border-radius: var(--radius-md);
  color: var(--muted);
  background: var(--surface-muted);
}

.search-field:focus-within {
  outline: 3px solid color-mix(in srgb, var(--focus-ring) 32%, transparent);
}

.search-field input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
}

.search-field input::placeholder {
  color: var(--faint);
}

.search-results {
  display: grid;
  max-height: 360px;
  padding-top: 12px;
  gap: 3px;
  overflow: auto;
}

.search-result {
  display: flex;
  width: 100%;
  min-height: 46px;
  padding: 0 13px;
  align-items: center;
  gap: 12px;
  border-radius: var(--radius-sm);
  color: var(--ink);
  background: transparent;
  text-align: left;
}

.search-result:hover {
  background: var(--surface-muted);
}

.search-result span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-empty {
  padding: 44px 20px 38px;
  color: var(--muted);
  text-align: center;
}

.search-empty p {
  margin: 0 0 5px;
  color: var(--ink);
  font-weight: 600;
}

.search-empty span {
  font-size: 13px;
}
</style>
