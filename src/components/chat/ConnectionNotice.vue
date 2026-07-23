<script setup lang="ts">
import { CircleAlert } from "@lucide/vue"
</script>

<template>
  <aside class="connection-notice" role="status" aria-live="polite">
    <CircleAlert :size="18" :stroke-width="1.9" aria-hidden="true" />
    <div>
      <strong>尚未连接模型</strong>
      <span>这条消息只保存在当前浏览器中。</span>
    </div>
  </aside>
</template>

<style scoped>
.connection-notice {
  display: grid;
  width: min(100%, 520px);
  grid-template-columns: auto minmax(0, 1fr);
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.2rem 0;
  color: var(--danger);
}

.connection-notice div {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.connection-notice strong {
  color: var(--ink);
  font-size: 0.84rem;
  line-height: 1.4;
}

.connection-notice span {
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

@media (max-width: 520px) {
  .connection-notice {
    width: 100%;
  }
}
</style>
