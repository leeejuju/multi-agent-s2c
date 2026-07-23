<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue"
import { RouterLink } from "vue-router"

import OpenGlyph from "@/components/brand/OpenGlyph.vue"
</script>

<template>
  <div class="auth-shell">
    <header class="auth-shell__header">
      <RouterLink class="auth-shell__brand" to="/" aria-label="OpenGPT 首页">
        <OpenGlyph :size="30" />
        <span>OpenGPT</span>
      </RouterLink>
    </header>

    <main class="auth-shell__content">
      <slot />
    </main>

    <footer class="auth-shell__footer">
      <RouterLink class="auth-shell__home-link" to="/">
        <ArrowLeft aria-hidden="true" :size="15" :stroke-width="1.8" />
        <span>返回聊天</span>
      </RouterLink>
      <span>账号服务尚未连接</span>
    </footer>
  </div>
</template>

<style scoped>
.auth-shell {
  display: flex;
  min-height: 100svh;
  flex-direction: column;
  background: var(--surface);
  color: var(--ink);
}

.auth-shell__header {
  display: flex;
  min-height: 74px;
  padding: 18px 24px;
  align-items: center;
}

.auth-shell__brand,
.auth-shell__home-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.auth-shell__brand {
  font-family: var(--font-utility);
  font-size: 16px;
  font-weight: 700;
}

.auth-shell__content {
  display: flex;
  width: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px 20px 72px;
}

.auth-shell__footer {
  display: flex;
  min-height: 58px;
  padding: 12px 24px 18px;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  color: var(--muted);
  font-size: 12px;
}

.auth-shell__home-link:hover {
  color: var(--ink);
}

@media (max-width: 520px) {
  .auth-shell__header {
    justify-content: center;
  }

  .auth-shell__footer {
    flex-wrap: wrap;
  }
}
</style>
