<script setup lang="ts">
import { MessageSquare } from "@lucide/vue";

import type { PrototypeConversation } from "@/types/prototype";

const props = withDefaults(
  defineProps<{
    conversations: PrototypeConversation[];
    activeConversationId?: string | null;
  }>(),
  {
    activeConversationId: null,
  },
);

const emit = defineEmits<{
  (event: "select-conversation", conversationId: string): void;
}>();

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function selectConversation(conversation: PrototypeConversation): void {
  emit("select-conversation", conversation.id);
}
</script>

<template>
  <section class="conversation-list" aria-labelledby="conversation-list-title">
    <div class="conversation-list__heading">
      <h2 id="conversation-list-title">聊天记录</h2>
      <span v-if="props.conversations.length" aria-label="对话数量">
        {{ props.conversations.length }}
      </span>
    </div>

    <div v-if="props.conversations.length" class="conversation-list__items">
      <button
        v-for="conversation in props.conversations"
        :key="conversation.id"
        class="conversation-list__item"
        :class="{
          'conversation-list__item--active':
            conversation.id === props.activeConversationId,
        }"
        type="button"
        :aria-current="
          conversation.id === props.activeConversationId ? 'page' : undefined
        "
        :title="conversation.title || '未命名对话'"
        @click="selectConversation(conversation)"
      >
        <span class="conversation-list__active-line" aria-hidden="true" />
        <MessageSquare
          class="conversation-list__icon"
          :size="16"
          :stroke-width="1.8"
          aria-hidden="true"
        />
        <span class="conversation-list__content">
          <span class="conversation-list__title">
            {{ conversation.title || "未命名对话" }}
          </span>
          <span class="conversation-list__meta">
            <span>{{ formatUpdatedAt(conversation.updatedAt) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ conversation.messages.length }} 条消息</span>
          </span>
        </span>
      </button>
    </div>

    <div v-else class="conversation-list__empty">
      <MessageSquare :size="20" :stroke-width="1.6" aria-hidden="true" />
      <p>暂无对话</p>
    </div>
  </section>
</template>

<style scoped>
.conversation-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 0.25rem 0.5rem 0.75rem;
}

.conversation-list__heading {
  display: flex;
  min-height: 2rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.625rem;
  color: var(--muted);
}

.conversation-list__heading h2 {
  margin: 0;
  font-size: 0.69rem;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.conversation-list__heading span {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}

.conversation-list__items {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--sidebar-hover) transparent;
  scrollbar-width: thin;
}

.conversation-list__item {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 0.625rem;
  margin: 0.125rem 0;
  padding: 0.625rem 0.625rem;
  overflow: hidden;
  border: 0;
  border-radius: 0.7rem;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.conversation-list__item:hover {
  background: var(--sidebar-hover);
}

.conversation-list__item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.conversation-list__item--active {
  background: var(--accent-soft);
}

.conversation-list__item--active:hover {
  background: var(--accent-soft);
}

.conversation-list__active-line {
  position: absolute;
  inset-block: 0.625rem;
  inset-inline-start: 0;
  width: 0.18rem;
  border-radius: 999px;
  background: transparent;
}

.conversation-list__item--active .conversation-list__active-line {
  background: var(--accent);
}

.conversation-list__icon {
  flex: 0 0 auto;
  color: var(--muted);
}

.conversation-list__item--active .conversation-list__icon {
  color: var(--accent);
}

.conversation-list__content {
  display: grid;
  min-width: 0;
  flex: 1 1 auto;
  gap: 0.18rem;
}

.conversation-list__title {
  overflow: hidden;
  font-size: 0.845rem;
  font-weight: 540;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-list__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-list__empty {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 0.55rem;
  margin: 0.1rem;
  padding: 0 0.55rem;
  color: var(--muted);
  text-align: left;
}

.conversation-list__empty p {
  margin: 0;
  font-size: 0.8rem;
}

@media (prefers-reduced-motion: reduce) {
  .conversation-list__item {
    transition: none;
  }
}
</style>
