<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string
    inverted?: boolean
  }>(),
  {
    size: 32,
    inverted: false
  }
)
</script>

<template>
  <svg
    class="open-glyph"
    :class="{ 'open-glyph--inverted': inverted }"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
  >
    <path
      class="open-glyph__orbit"
      d="M43.2 18.8A19 19 0 1 0 48.8 41"
      stroke-width="5.5"
      stroke-linecap="round"
    />
    <path
      class="open-glyph__opening"
      d="M45.2 14.8L43.8 24.5L53.4 22.8"
      stroke-width="4.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle class="open-glyph__core" cx="32" cy="32" r="5" />
  </svg>
</template>

<style scoped>
.open-glyph {
  display: block;
  flex: none;
}

.open-glyph__orbit {
  stroke: var(--ink);
}

.open-glyph__opening {
  stroke: var(--ink);
}

.open-glyph__core {
  fill: var(--ink);
}

.open-glyph--inverted .open-glyph__orbit {
  stroke: var(--canvas);
}
</style>
