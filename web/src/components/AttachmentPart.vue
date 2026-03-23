<template>
  <div class="attachment-part">
    <div class="attachment-list">
      <div class="attachment-item" v-for="(name, index) in files" :key="index">
        <span v-if="loading" class="spinner"></span>
        <span class="attachment-name">{{ name }}</span>
        <button class="attachment-remove" @click="removeFile(index)">
          <X :size="14" />
        </button>
      </div>
    </div>

    <label class="attachment-upload">
      <input type="file" multiple :accept="acceptTypes" style="display: none;" />
      <Paperclip :size="14" />
    </label>
  </div>
</template>
<script setup lang="ts">
import { Paperclip, X } from "lucide-vue-next"

const acceptTypes =
  import.meta.env.VITE_FILE_ACCEPT ||
  ".txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.ico,.tif,.tiff,.heic,.heif"

defineProps({
  files: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(["removeFile", "uploadFile"])

const removeFile = (index: number) => {
  emit("removeFile", index)
}
</script>
<style scoped>
.spinner {
  width: 12px;
  height: 12px;
  display: inline-block;
  border: 2px solid #ccc;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
