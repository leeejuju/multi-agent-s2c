<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"
import { Check, ChevronDown } from "@lucide/vue"

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const closeOnOutsideClick = (event: MouseEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

const closeOnEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") open.value = false
}

onMounted(() => {
  document.addEventListener("mousedown", closeOnOutsideClick)
  document.addEventListener("keydown", closeOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", closeOnOutsideClick)
  document.removeEventListener("keydown", closeOnEscape)
})
</script>

<template>
  <div ref="root" class="model-selector">
    <button
      class="model-selector__trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span>OpenGPT</span>
      <ChevronDown
        class="model-selector__chevron context-actions"
        :class="{ 'is-open': open }"
        :size="15"
        :stroke-width="2"
        aria-hidden="true"
      />
    </button>

    <Transition name="model-menu">
      <div v-if="open" class="model-selector__menu" role="menu">
        <button type="button" role="menuitemradio" aria-checked="true">
          <span>OpenGPT</span>
          <Check :size="16" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.model-selector {
  position: relative;
}

.model-selector__trigger {
  display: inline-flex;
  min-height: 36px;
  padding: 0 6px;
  align-items: center;
  gap: 4px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.model-selector__trigger:hover,
.model-selector__trigger[aria-expanded="true"] {
  background: var(--surface-muted);
}

.model-selector__chevron.is-open,
.model-selector__trigger[aria-expanded="true"] .model-selector__chevron {
  opacity: 1;
  pointer-events: auto;
}

.model-selector__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  min-width: 180px;
  padding: 4px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: 0 8px 28px rgb(0 0 0 / 10%);
}

.model-selector__menu button {
  display: flex;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--radius-sm);
  color: var(--ink);
  background: transparent;
  font-size: 14px;
  text-align: left;
}

.model-selector__menu button:hover {
  background: var(--surface-muted);
}

.model-menu-enter-active,
.model-menu-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.model-menu-enter-from,
.model-menu-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

@media (max-width: 560px) {
  .model-selector__trigger {
    font-size: 15px;
  }
}
</style>
