<template>
  <div class="attachment-capsules">
    <div v-for="(img, idx) in images" :key="'img-' + idx" class="capsule image-capsule">
      <img :src="img.src" alt="image" class="capsule-img" />
      <span class="capsule-name">{{ img.file?.name || img.fileName || "图片" }}</span>
      <button type="button" class="capsule-remove" @click="emit('removeImage', idx)" title="移除">
        <X :size="14" />
      </button>
    </div>

    <div v-for="(file, idx) in attachments" :key="'file-' + idx" class="capsule file-capsule">
      <div class="capsule-icon">
        <FileText :size="14" />
      </div>
      <span class="capsule-name">{{ file.name || file.file_name || "附件" }}</span>
      <button type="button" class="capsule-remove" @click="emit('removeAttachment', idx)" title="移除">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText, X } from "lucide-vue-next"

defineProps({
  images: {
    type: Array as () => Array<{ src: string; file?: File; fileName?: string }>,
    default: () => [],
  },
  attachments: {
    type: Array as () => Array<{ name?: string; file_name?: string }>,
    default: () => [],
  },
})

const emit = defineEmits(["removeImage", "removeAttachment"])
</script>

<style scoped>
.attachment-capsules {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 4px;
}

.capsule {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 9999px;
  padding: 2px 8px 2px 2px;
  max-width: 160px;
  border: 1px solid #e2e8f0;
}

.capsule-img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.capsule-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  color: #64748b;
  margin-left: 1px;
}

.capsule-name {
  font-size: 11px;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.capsule-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  border-radius: 50%;
  transition: all 0.2s;
}

.capsule-remove:hover {
  background: #e2e8f0;
  color: #ef4444;
}
</style>
