<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, X, Clock } from 'lucide-vue-next'
import type { ImageFile } from '../types'

defineProps<{
  multiple?: boolean
  cachedImages?: ImageFile[]
}>()

const emit = defineEmits<{
  upload: [files: File[]]
  selectFromCache: [image: ImageFile]
  removeFromCache: [id: string]
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

function onSelectCached(image: ImageFile) {
  emit('selectFromCache', image)
}

function onRemoveCached(e: Event, id: string) {
  e.stopPropagation()
  emit('removeFromCache', id)
}
</script>

<template>
  <div class="uploader-container">
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

    <div v-if="cachedImages && cachedImages.length > 0" class="cached-section">
      <div class="cached-header">
        <Clock :size="16" />
        <span>最近使用</span>
      </div>
      <div class="cached-grid">
        <div
          v-for="image in cachedImages"
          :key="image.id"
          class="cached-item"
          @click="onSelectCached(image)"
        >
          <img :src="image.url" :alt="image.name" />
          <button class="cached-remove" @click="onRemoveCached($event, image.id)">
            <X :size="14" />
          </button>
          <span class="cached-name">{{ image.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.uploader-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

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

.cached-section {
  width: 100%;
  max-width: 480px;
}

.cached-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.cached-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.cached-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: var(--color-bg-secondary);
}

.light .cached-item {
  background-color: var(--color-bg-light-secondary);
}

.cached-item:hover {
  border-color: var(--color-accent);
  transform: scale(1.02);
}

.cached-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cached-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cached-item:hover .cached-remove {
  opacity: 1;
}

.cached-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  font-size: 10px;
  color: white;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cached-item:hover .cached-name {
  opacity: 1;
}
</style>
