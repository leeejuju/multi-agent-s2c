<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"
import { Check, ChevronDown } from "@lucide/vue"

export interface SelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: SelectOption[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selectOption = (value: string) => {
  emit("update:modelValue", value)
  open.value = false
}

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

const getSelectedLabel = () =>
  props.options.find((opt) => opt.value === props.modelValue)?.label ??
  props.options[0]?.label ??
  ""
</script>

<template>
  <div ref="root" class="app-select">
    <button
      class="app-select__trigger"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      @click="open = !open"
    >
      <span>{{ getSelectedLabel() }}</span>
      <ChevronDown
        class="app-select__chevron"
        :class="{ 'is-open': open }"
        :size="14"
        :stroke-width="2"
        aria-hidden="true"
      />
    </button>

    <Transition name="select-menu">
      <div
        v-if="open"
        class="app-select__menu"
        role="listbox"
        :aria-label="ariaLabel"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="option.value === modelValue"
          class="app-select__option"
          :class="{ 'is-selected': option.value === modelValue }"
          @click="selectOption(option.value)"
        >
          <span>{{ option.label }}</span>
          <Check
            v-if="option.value === modelValue"
            :size="14"
            :stroke-width="2"
            aria-hidden="true"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  display: inline-block;
}

.app-select__trigger {
  display: inline-flex;
  min-height: 32px;
  padding: 0 10px 0 12px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink);
  font-size: 0.88rem;
  font-weight: 450;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.app-select__trigger:hover {
  background: var(--surface-muted);
  border-color: rgb(13 13 13 / 18%);
}

.app-select__trigger:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.app-select__chevron {
  color: var(--muted);
  transition: transform 140ms ease;
}

.app-select__chevron.is-open {
  transform: rotate(180deg);
}

.app-select__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  min-width: 130px;
  padding: 4px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 8%);
}

.app-select__option {
  display: flex;
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-size: 0.86rem;
  text-align: left;
  cursor: pointer;
}

.app-select__option:hover {
  background: var(--surface-muted);
}

.app-select__option.is-selected {
  font-weight: 600;
}

.select-menu-enter-active,
.select-menu-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.select-menu-enter-from,
.select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
