<template>
  <div class="attachment-capsules">
    <div v-for="(img, idx) in images" :key="img.id || 'img-' + idx" class="capsule image-capsule"
      :class="{ 'is-uploading': img.uploading }">
      <img :src="img.src" alt="image" class="capsule-img" />
      <span class="capsule-name">{{ img.file?.name || img.fileName || "图片" }}</span>
      <button type="button" class="capsule-remove" @click="emit('removeImage', idx)" title="移除">
        <X :size="14" />
      </button>
    </div>

    <div v-for="(file, idx) in attachments" :key="file.id || 'file-' + idx" class="capsule file-capsule"
      :class="{ 'is-uploading': file.uploading }">
      <div class="capsule-icon" :class="{ 'is-rotating': file.uploading }">
        <component :is="resolveFileIcon(file)" :size="14" />
      </div>
      <span class="capsule-name">{{ file.name || file.file_name || "附件" }}</span>
      <button type="button" class="capsule-remove" @click="emit('removeAttachment', idx)" title="移除">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  File as FileIcon,
  FileArchive,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  X,
} from "lucide-vue-next"

type AttachmentLike = {
  id?: string
  name?: string
  file_name?: string
  uploading?: boolean
}

type ImageLike = {
  id?: string
  src: string
  file?: File
  fileName?: string
  uploading?: boolean
}

defineProps({
  images: {
    type: Array as () => ImageLike[],
    default: () => [],
  },
  attachments: {
    type: Array as () => AttachmentLike[],
    default: () => [],
  },
})

const emit = defineEmits(["removeImage", "removeAttachment"])

const fileIconMap = {
  pdf: FileText,
  txt: FileText,
  doc: FileText,
  docx: FileText,
  md: FileCode2,
  markdown: FileCode2,
  json: FileJson,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
}

const getFileExtension = (file: AttachmentLike) => {
  const filename = file.name || file.file_name || ""
  const extension = filename.split(".").pop()
  return extension ? extension.toLowerCase() : ""
}

const resolveFileIcon = (file: AttachmentLike) => {
  const extension = getFileExtension(file)
  return fileIconMap[extension as keyof typeof fileIconMap] || FileIcon
}
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
  transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
}

.capsule.is-uploading {
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28);
  animation: capsulePulse 1.35s ease-in-out infinite;
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

.capsule-icon.is-rotating {
  animation: iconSpin 1.05s linear infinite;
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

@keyframes capsulePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.24);
    transform: translateY(0);
  }

  50% {
    box-shadow: 0 0 0 7px rgba(59, 130, 246, 0);
    transform: translateY(-1px);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    transform: translateY(0);
  }
}

@keyframes iconSpin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.attachment-capsules {
  gap: 8px;
  padding-bottom: 2px;
}

.capsule {
  gap: 7px;
  max-width: 190px;
  padding: 3px 10px 3px 3px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.capsule:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 10px 18px rgba(148, 163, 184, 0.14);
}

.capsule.is-uploading {
  border-color: rgba(125, 211, 252, 0.6);
}

.capsule-img {
  width: 26px;
  height: 26px;
  border-radius: 10px;
}

.capsule-icon {
  width: 26px;
  height: 26px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 10px;
  color: #475569;
}

.capsule-name {
  font-size: 12px;
  color: #334155;
}

.capsule-remove {
  width: 20px;
  height: 20px;
}

.capsule-remove:hover {
  background: #e2e8f0;
  color: #dc2626;
}
</style>
