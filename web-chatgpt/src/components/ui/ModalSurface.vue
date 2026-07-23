<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue"
import { X } from "@lucide/vue"

import AppIconButton from "@/components/ui/AppIconButton.vue"

const props = defineProps<{
  open: boolean
  title: string
  description?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") emit("close")
}

watch(
  () => props.open,
  (open) => {
    document.body.toggleAttribute("data-modal-open", open)
    if (open) {
      document.addEventListener("keydown", onKeydown)
    } else {
      document.removeEventListener("keydown", onKeydown)
    }
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
    <Transition name="modal">
      <div v-if="open" class="modal-layer" @mousedown.self="$emit('close')">
        <section
          class="modal-surface"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header class="modal-surface__header">
            <div>
              <h2>{{ title }}</h2>
              <p v-if="description">{{ description }}</p>
            </div>
            <AppIconButton label="Close" @click="$emit('close')">
              <X :size="19" :stroke-width="1.8" />
            </AppIconButton>
          </header>

          <div class="modal-surface__body">
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  padding: 20px;
  place-items: center;
  background: var(--overlay);
}

.modal-surface {
  width: min(100%, 520px);
  max-height: min(720px, calc(100dvh - 40px));
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.modal-surface__header {
  display: flex;
  min-height: auto;
  padding: 1.25rem 1rem 0.75rem 1.35rem;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.modal-surface__header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.modal-surface__header p {
  margin: 0.35rem 0 0;
  color: var(--muted);
  font-size: 0.84rem;
}

.modal-surface__body {
  max-height: calc(100dvh - 140px);
  padding: 0 1.35rem 1.35rem;
  overflow: auto;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 160ms ease;
}

.modal-enter-active .modal-surface,
.modal-leave-active .modal-surface {
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-surface,
.modal-leave-to .modal-surface {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 560px) {
  .modal-layer {
    padding: 0;
    place-items: end stretch;
  }

  .modal-surface {
    width: 100%;
    max-height: 88dvh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
}
</style>
