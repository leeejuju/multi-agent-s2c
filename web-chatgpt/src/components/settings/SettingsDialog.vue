<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue"
import { X } from "@lucide/vue"

import AppIconButton from "@/components/ui/AppIconButton.vue"
import type { SettingsSectionId } from "@/types/settings"

import SettingsAppRail from "./SettingsAppRail.vue"
import SettingsWorkspace from "./SettingsWorkspace.vue"

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const activeSection = ref<SettingsSectionId>("general")

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") emit("close")
}

watch(
  () => props.open,
  (open) => {
    document.body.toggleAttribute("data-modal-open", open)

    if (open) {
      activeSection.value = "general"
      document.addEventListener("keydown", onKeydown)
      return
    }

    document.removeEventListener("keydown", onKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.body.removeAttribute("data-modal-open")
  document.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="settings-modal">
      <div
        v-if="open"
        class="settings-layer"
        @mousedown.self="emit('close')"
      >
        <section
          class="settings-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog-title"
        >
          <header class="settings-dialog__header">
            <h2 id="settings-dialog-title">Settings</h2>
            <AppIconButton label="Close" @click="emit('close')">
              <X :size="19" :stroke-width="1.8" />
            </AppIconButton>
          </header>

          <div class="settings-dialog__body">
            <div class="settings-dialog__rail">
              <SettingsAppRail
                :active-section="activeSection"
                @select="activeSection = $event"
              />
            </div>

            <div class="settings-dialog__workspace">
              <SettingsWorkspace :active-section="activeSection" />
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  padding: 24px;
  place-items: center;
  background: var(--overlay);
}

.settings-dialog {
  display: flex;
  width: min(100%, 860px);
  height: min(640px, calc(100dvh - 48px));
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.settings-dialog__header {
  display: flex;
  flex: 0 0 auto;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0.35rem 0.65rem 0.15rem 1.35rem;
}

.settings-dialog__header h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* 2 : 8 layout — left App Rail, right workspace */
.settings-dialog__body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 2fr 8fr;
}

.settings-dialog__rail,
.settings-dialog__workspace {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  height: 100%;
}

.settings-dialog__rail {
  border-right: 1px solid var(--line);
}

.settings-modal-enter-active,
.settings-modal-leave-active {
  transition: opacity 160ms ease;
}

.settings-modal-enter-active .settings-dialog,
.settings-modal-leave-active .settings-dialog {
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease;
}

.settings-modal-enter-from,
.settings-modal-leave-to {
  opacity: 0;
}

.settings-modal-enter-from .settings-dialog,
.settings-modal-leave-to .settings-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}

@media (max-width: 720px) {
  .settings-layer {
    padding: 0;
    place-items: end stretch;
  }

  .settings-dialog {
    width: 100%;
    height: min(92dvh, 760px);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .settings-dialog__body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-modal-enter-active,
  .settings-modal-leave-active,
  .settings-modal-enter-active .settings-dialog,
  .settings-modal-leave-active .settings-dialog {
    transition: none;
  }
}
</style>
