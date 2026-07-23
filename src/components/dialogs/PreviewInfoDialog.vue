<script setup lang="ts">
import { CircleCheck, CircleDashed, HardDrive } from "@lucide/vue"

import ModalSurface from "@/components/ui/ModalSurface.vue"

defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <ModalSurface
    :open="open"
    title="关于这个预览"
    description="先确认体验，再连接真实服务"
    @close="$emit('close')"
  >
    <div class="preview-status">
      <div class="preview-status__item">
        <span class="preview-status__icon preview-status__icon--ready">
          <CircleCheck :size="18" :stroke-width="2" />
        </span>
        <div>
          <strong>Vue 界面</strong>
          <span>组件化页面与本地交互已启用</span>
        </div>
        <em>当前</em>
      </div>

      <div class="preview-status__item">
        <span class="preview-status__icon">
          <HardDrive :size="18" :stroke-width="1.9" />
        </span>
        <div>
          <strong>本地内容</strong>
          <span>仅保存你在这个浏览器中输入的对话</span>
        </div>
        <em>本地</em>
      </div>

      <div class="preview-status__item">
        <span class="preview-status__icon">
          <CircleDashed :size="18" :stroke-width="1.9" />
        </span>
        <div>
          <strong>模型与后端</strong>
          <span>账号、模型回复与文件上传将在下一阶段接入</span>
        </div>
        <em>待接入</em>
      </div>
    </div>
  </ModalSurface>
</template>

<style scoped>
.preview-status {
  display: grid;
  gap: 4px;
}

.preview-status__item {
  display: grid;
  min-height: 76px;
  padding: 14px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}

.preview-status__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  color: var(--muted);
  background: var(--surface);
}

.preview-status__icon--ready {
  color: var(--accent);
  background: var(--accent-soft);
}

.preview-status__item div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.preview-status__item strong {
  font-size: 14px;
  font-weight: 650;
}

.preview-status__item div span {
  color: var(--muted);
  font-size: 12px;
}

.preview-status__item em {
  color: var(--muted);
  font-family: var(--font-utility);
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
</style>
