<script setup lang="ts">
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "@lucide/vue"
import { RouterLink } from "vue-router"

const props = defineProps<{
  title: string
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  "toggle-sidebar": []
}>()
</script>

<template>
  <header class="app-view-header">
    <div class="app-view-header__identity">
      <button
        class="app-view-header__icon-button"
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
      <h1>{{ props.title }}</h1>
    </div>

    <nav class="app-view-header__actions" aria-label="Account actions">
      <RouterLink class="app-view-header__login context-actions" to="/login">
        Log in
      </RouterLink>
      <RouterLink class="app-view-header__signup" to="/register">
        <span class="app-view-header__signup-full">Sign up for free</span>
        <span class="app-view-header__signup-short">Sign up</span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.app-view-header {
  display: flex;
  min-height: 52px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem clamp(0.75rem, 2vw, 1.25rem);
}

.app-view-header__identity,
.app-view-header__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.35rem;
}

.app-view-header h1 {
  margin: 0;
  overflow: hidden;
  font-size: 1rem;
  font-weight: 550;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-view-header__icon-button {
  display: inline-flex;
  min-width: 36px;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--muted);
  background: transparent;
}

.app-view-header__icon-button:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.app-view-header__icon-button:focus-visible,
.app-view-header__login:focus-visible,
.app-view-header__signup:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.app-view-header__login,
.app-view-header__signup {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 550;
}

.app-view-header__login {
  color: var(--muted);
}

.app-view-header__login:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.app-view-header__signup {
  color: var(--surface);
  background: var(--ink);
}

.app-view-header__signup:hover {
  background: var(--accent-hover);
}

.app-view-header__signup-short {
  display: none;
}

@media (max-width: 560px) {
  .app-view-header {
    min-height: 48px;
  }

  .app-view-header__login {
    display: none;
  }

  .app-view-header__signup {
    min-height: 32px;
    padding-inline: 10px;
  }

  .app-view-header__signup-full {
    display: none;
  }

  .app-view-header__signup-short {
    display: inline;
  }
}
</style>
