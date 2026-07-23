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
      <ChevronDown :size="15" :stroke-width="2" aria-hidden="true" />
    </button>

    <Transition name="model-menu">
      <div v-if="open" class="model-selector__menu" role="menu">
        <button type="button" role="menuitemradio" aria-checked="true">
          <span>
            <strong>OpenGPT</strong>
            <small>当前模型</small>
          </span>
          <Check :size="17" :stroke-width="2" aria-hidden="true" />
        </button>
        <p>更多模型将在接入后显示</p>
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
  min-height: 40px;
  padding: 0 10px;
  align-items: center;
  gap: 5px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.model-selector__trigger:hover,
.model-selector__trigger[aria-expanded="true"] {
  background: var(--surface-muted);
}

.model-selector__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  width: 260px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.model-selector__menu button {
  display: flex;
  width: 100%;
  min-height: 56px;
  padding: 8px 10px;
  align-items: center;
  justify-content: space-between;
  border-radius: 9px;
  color: var(--ink);
  background: var(--surface-muted);
  text-align: left;
}

.model-selector__menu button > span {
  display: grid;
  gap: 1px;
}

.model-selector__menu strong {
  font-size: 14px;
  font-weight: 600;
}

.model-selector__menu small,
.model-selector__menu p {
  color: var(--muted);
  font-size: 12px;
}

.model-selector__menu p {
  margin: 8px 10px 4px;
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
    padding-inline: 7px;
    font-size: 16px;
  }
}
</style>
