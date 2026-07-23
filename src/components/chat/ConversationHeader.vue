<script setup lang="ts">
import {
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
} from "@lucide/vue"
import { RouterLink } from "vue-router"

import ModelSelector from "./ModelSelector.vue"

const props = defineProps<{
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  "toggle-sidebar": []
  "new-conversation": []
}>()
</script>

<template>
  <header class="conversation-header">
    <div class="conversation-header__identity">
      <button
        class="conversation-header__icon-button"
        type="button"
        :aria-label="props.sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        :title="props.sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        @click="emit('toggle-sidebar')"
      >
        <PanelLeftOpen v-if="props.sidebarCollapsed" :size="19" aria-hidden="true" />
        <PanelLeftClose v-else :size="19" aria-hidden="true" />
      </button>

      <ModelSelector />
    </div>

    <nav class="conversation-header__actions" aria-label="对话操作">
      <button
        class="conversation-header__icon-button"
        type="button"
        aria-label="新建聊天"
        title="新建聊天"
        @click="emit('new-conversation')"
      >
        <SquarePen :size="17" aria-hidden="true" />
      </button>

      <RouterLink class="conversation-header__login" to="/login">
        登录
      </RouterLink>
      <RouterLink class="conversation-header__signup" to="/register">
        <span class="conversation-header__signup-full">免费注册</span>
        <span class="conversation-header__signup-short">注册</span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.conversation-header {
  display: flex;
  min-height: 58px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--surface);
  padding: 0.6rem clamp(0.75rem, 2vw, 1.4rem);
}

.conversation-header__identity,
.conversation-header__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
}

.conversation-header__icon-button {
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0.48rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}

.conversation-header__icon-button:hover,
.conversation-header__login:hover {
  border-color: var(--surface-strong);
  background: var(--surface-muted);
}

.conversation-header__icon-button:focus-visible,
.conversation-header__login:focus-visible,
.conversation-header__signup:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.conversation-header__login,
.conversation-header__signup {
  display: inline-flex;
  min-height: 38px;
  padding: 0 14px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
}

.conversation-header__login {
  color: var(--ink);
}

.conversation-header__signup {
  color: var(--surface);
  background: var(--ink);
}

.conversation-header__signup:hover {
  background: var(--accent-hover);
}

.conversation-header__signup-short {
  display: none;
}

@media (max-width: 560px) {
  .conversation-header {
    min-height: 54px;
  }

  .conversation-header__login {
    display: none;
  }

  .conversation-header__signup {
    min-height: 36px;
    padding-inline: 12px;
  }

  .conversation-header__signup-full {
    display: none;
  }

  .conversation-header__signup-short {
    display: inline;
  }
}

@media (prefers-reduced-motion: reduce) {
  .conversation-header__icon-button {
    transition: none;
  }
}
</style>
