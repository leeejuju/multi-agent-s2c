<script setup lang="ts">
import type { PrototypeConversation } from "@/types/prototype"

const props = withDefaults(
  defineProps<{
    conversations: PrototypeConversation[]
    activeConversationId?: string | null
  }>(),
  {
    activeConversationId: null,
  },
)

const emit = defineEmits<{
  (event: "select-conversation", conversationId: string): void
}>()

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function selectConversation(conversation: PrototypeConversation): void {
  emit("select-conversation", conversation.id)
}
</script>

<template>
  <section class="conversation-list" aria-labelledby="conversation-list-title">
    <h2 id="conversation-list-title" class="conversation-list__heading">
      Chats
    </h2>

    <div v-if="props.conversations.length" class="conversation-list__items">
      <button
        v-for="conversation in props.conversations"
        :key="conversation.id"
        class="conversation-list__item"
        :class="{
          'conversation-list__item--active is-selected':
            conversation.id === props.activeConversationId,
        }"
        type="button"
        :aria-current="
          conversation.id === props.activeConversationId ? 'page' : undefined
        "
        :title="conversation.title || 'Untitled conversation'"
        @click="selectConversation(conversation)"
      >
        <span class="conversation-list__title">
          {{ conversation.title || "Untitled conversation" }}
        </span>
        <span class="context-actions conversation-list__meta">
          {{ formatUpdatedAt(conversation.updatedAt) }}
        </span>
      </button>
    </div>

    <p v-else class="conversation-list__empty">No conversations</p>
  </section>
</template>

<style scoped>
.conversation-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 0.15rem 0.4rem 0.75rem;
}

.conversation-list__heading {
  margin: 0;
  min-height: 1.75rem;
  padding: 0.35rem 0.65rem 0.45rem;
  color: var(--faint);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.conversation-list__items {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--sidebar-hover) transparent;
  scrollbar-width: thin;
}

.conversation-list__item {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 2.2rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0;
  padding: 0.45rem 0.65rem;
  overflow: hidden;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.conversation-list__item:hover {
  background: var(--sidebar-hover);
}

.conversation-list__item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.conversation-list__item--active {
  background: transparent;
  font-weight: 600;
}

.conversation-list__item--active:hover {
  background: var(--sidebar-hover);
}

.conversation-list__title {
  min-width: 0;
  overflow: hidden;
  font-size: 0.86rem;
  font-weight: inherit;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-list__meta {
  flex: 0 0 auto;
  color: var(--faint);
  font-size: 0.68rem;
  font-weight: 400;
  white-space: nowrap;
}

.conversation-list__empty {
  margin: 0.15rem 0.65rem;
  color: var(--faint);
  font-size: 0.82rem;
}
</style>
