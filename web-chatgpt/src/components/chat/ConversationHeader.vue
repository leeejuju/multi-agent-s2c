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
        :aria-label="props.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="props.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggle-sidebar')"
      >
        <PanelLeftOpen
          v-if="props.sidebarCollapsed"
          :size="19"
          :stroke-width="1.8"
          aria-hidden="true"
        />
        <PanelLeftClose
          v-else
          :size="19"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </button>

      <ModelSelector />
    </div>

    <nav class="conversation-header__actions" aria-label="Conversation actions">
      <button
        class="context-actions conversation-header__icon-button"
        type="button"
        aria-label="New chat"
        title="New chat"
        @click="emit('new-conversation')"
      >
        <SquarePen :size="17" :stroke-width="1.8" aria-hidden="true" />
      </button>

      <RouterLink class="conversation-header__login context-actions" to="/login">
        Log in
      </RouterLink>
      <RouterLink class="conversation-header__signup" to="/register">
        <span class="conversation-header__signup-full">Sign up for free</span>
        <span class="conversation-header__signup-short">Sign up</span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.conversation-header {
  display: flex;
  min-height: 52px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: transparent;
  padding: 0.5rem clamp(0.75rem, 2vw, 1.25rem);
}

.conversation-header__identity,
.conversation-header__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.35rem;
}

.conversation-header__icon-button {
  display: inline-flex;
  min-width: 36px;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
}

.conversation-header__icon-button:hover {
  background: var(--surface-muted);
  color: var(--ink);
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
  min-height: 34px;
  padding: 0 12px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 550;
}

.conversation-header__login {
  color: var(--muted);
}

.conversation-header__login:hover {
  color: var(--ink);
  background: var(--surface-muted);
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
    min-height: 48px;
  }

  .conversation-header__login {
    display: none;
  }

  .conversation-header__signup {
    min-height: 32px;
    padding-inline: 10px;
  }

  .conversation-header__signup-full {
    display: none;
  }

  .conversation-header__signup-short {
    display: inline;
  }
}
</style>
