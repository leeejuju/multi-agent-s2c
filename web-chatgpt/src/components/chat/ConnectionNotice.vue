<script setup lang="ts">
import { CircleAlert } from "@lucide/vue"
</script>

<template>
  <aside class="connection-notice" role="status" aria-live="polite">
    <CircleAlert :size="16" :stroke-width="1.8" aria-hidden="true" />
    <p>尚未连接模型 · 仅保存在当前浏览器</p>
  </aside>
</template>

<style scoped>
.connection-notice {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.45rem;
  padding: 0.15rem 0;
  color: var(--faint);
}

.connection-notice p {
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
}
</style>
