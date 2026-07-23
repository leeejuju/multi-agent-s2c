<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { Search } from "@lucide/vue"

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
    title="Search chats"
    @close="$emit('close')"
  >
    <label class="search-field">
      <Search :size="17" :stroke-width="1.8" aria-hidden="true" />
      <span class="sr-only">Search query</span>
      <input
        ref="input"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="Search title"
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
        <span>{{ conversation.title }}</span>
      </button>

      <p v-if="results.length === 0" class="search-empty">
        {{ conversations.length === 0 ? "No conversations" : "No matches found" }}
      </p>
    </div>
  </ModalSurface>
</template>

<style scoped>
.search-field {
  display: flex;
  min-height: 40px;
  padding: 0 0 0.55rem;
  align-items: center;
  gap: 0.55rem;
  border-bottom: 1px solid var(--line-strong);
  color: var(--muted);
  background: transparent;
}

.search-field:focus-within {
  border-bottom-color: rgb(13 13 13 / 22%);
  color: var(--ink);
}

.search-field input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 0.92rem;
}

.search-field input::placeholder {
  color: var(--faint);
}

.search-results {
  display: grid;
  max-height: 360px;
  padding-top: 0.5rem;
  gap: 0;
  overflow: auto;
}

.search-result {
  display: flex;
  width: 100%;
  min-height: 2.4rem;
  padding: 0.45rem 0.15rem;
  align-items: center;
  border-radius: var(--radius-sm);
  color: var(--ink);
  background: transparent;
  font-size: 0.9rem;
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
  margin: 0;
  padding: 1.75rem 0.25rem;
  color: var(--faint);
  font-size: 0.86rem;
  text-align: left;
}
</style>
