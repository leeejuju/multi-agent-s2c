<template>
  <div class="attachment-capsules">
    <!-- 图片部分 -->
    <div class="capsule image-capsule" v-for="(img, idx) in images" :key="'img-' + idx">
      <img :src="img.src" alt="image" class="capsule-img" />
      <span class="capsule-name">{{ img.file?.name || '图片' }}</span>
      <button type="button" class="capsule-remove" @click="$emit('removeImage', idx)" title="移除">
        <X :size="14" />
      </button>
    </div>

    <!-- 文件部分 -->
    <div class="capsule file-capsule" v-for="(file, idx) in attachments" :key="'file-' + idx">
      <div class="capsule-icon">
        <FileText :size="14" />
      </div>
      <span class="capsule-name">{{ file.name }}</span>
      <button type="button" class="capsule-remove" @click="$emit('removeAttachment', idx)" title="移除">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, FileText } from "lucide-vue-next"

defineProps({
  images: {
    type: Array as () => Array<{ src: string; file?: File }>,
    default: () => []
  },
  attachments: {
    type: Array as () => File[],
    default: () => []
  }
})

defineEmits(['removeImage', 'removeAttachment'])
</script>

<style scoped>
.attachment-capsules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
}

.capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border-radius: 9999px;
  padding: 4px 10px 4px 4px;
  max-width: 200px;
  border: 1px solid #e2e8f0;
}

.capsule-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.capsule-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #ffffff;
  border-radius: 50%;
  color: #64748b;
  margin-left: 2px;
}

.capsule-name {
  font-size: 13px;
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
  padding: 2px;
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
