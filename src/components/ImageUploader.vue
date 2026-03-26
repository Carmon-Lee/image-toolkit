<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus } from 'lucide-vue-next'

defineProps<{
  multiple?: boolean
}>()

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const isDragging = ref(false)

function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'))
  if (files.length) emit('upload', files)
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? []).filter(f => f.type.startsWith('image/'))
  if (files.length) emit('upload', files)
  input.value = ''
}

const fileInput = ref<HTMLInputElement>()
</script>

<template>
  <div
    class="uploader"
    :class="{ dragging: isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    @click="fileInput?.click()"
  >
    <input
      ref="fileInput"
      type="file"
      :multiple="multiple"
      accept="image/*"
      hidden
      @change="onFileSelect"
    />
    <div class="uploader-icon">
      <ImagePlus :size="48" :stroke-width="1.2" />
    </div>
    <p class="uploader-title">拖放图片到此处</p>
    <p class="uploader-hint">或点击选择文件</p>
    <p class="uploader-formats">支持 PNG, JPG, WebP, GIF, BMP</p>
  </div>
</template>

<style scoped>
.uploader {
  width: 100%;
  max-width: 480px;
  padding: 56px 40px;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--color-bg-secondary);
}

.light .uploader {
  background-color: var(--color-bg-light-secondary);
  border-color: var(--color-border-light);
}

.uploader:hover,
.uploader.dragging {
  border-color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.light .uploader:hover,
.light .uploader.dragging {
  border-color: var(--color-accent-light);
  background-color: rgba(99, 102, 241, 0.05);
}

.uploader-icon {
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.uploader:hover .uploader-icon,
.uploader.dragging .uploader-icon {
  color: var(--color-accent);
}

.uploader-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.light .uploader-title {
  color: var(--color-text-light-primary);
}

.uploader-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.uploader-formats {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>
