<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ToolType, ImageFile } from './types'
import Sidebar from './components/Sidebar.vue'
import ImageUploader from './components/ImageUploader.vue'
import CropTool from './components/tools/CropTool.vue'
import RotateTool from './components/tools/RotateTool.vue'
import MergeTool from './components/tools/MergeTool.vue'
import ResizeTool from './components/tools/ResizeTool.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useTheme } from './composables/useTheme'

const { init } = useTheme()
onMounted(init)

const activeTool = ref<ToolType>('crop')
const currentImage = ref<ImageFile | null>(null)
const mergeImages = ref<ImageFile[]>([])
const isMobileMenuOpen = ref(false)

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function onToolChange(tool: ToolType) {
  activeTool.value = tool
  isMobileMenuOpen.value = false
}

function loadImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        id: generateId(),
        name: file.name,
        url,
        file,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.src = url
  })
}

async function onFileUpload(files: File[]) {
  if (activeTool.value === 'merge') {
    for (const file of files) {
      const imageFile = await loadImageFile(file)
      mergeImages.value.push(imageFile)
    }
  } else {
    const imageFile = await loadImageFile(files[0])
    currentImage.value = imageFile
  }
}

function onClearImage() {
  if (currentImage.value) {
    URL.revokeObjectURL(currentImage.value.url)
    currentImage.value = null
  }
}

function onClearMergeImages() {
  mergeImages.value.forEach(img => URL.revokeObjectURL(img.url))
  mergeImages.value = []
}

function onRemoveMergeImage(id: string) {
  const idx = mergeImages.value.findIndex(img => img.id === id)
  if (idx !== -1) {
    URL.revokeObjectURL(mergeImages.value[idx].url)
    mergeImages.value.splice(idx, 1)
  }
}

function shouldShowUploader(): boolean {
  return !currentImage.value
}
</script>

<template>
  <div class="app-container">
    <div
      v-if="isMobileMenuOpen"
      class="sidebar-overlay"
      @click="isMobileMenuOpen = false"
    ></div>
    <Sidebar
      :class="{ 'mobile-open': isMobileMenuOpen }"
      :activeTool="activeTool"
      @change="onToolChange"
    />
    <div class="mobile-header">
      <button class="menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <span class="mobile-title">ImageKit</span>
    </div>
    <main class="main-area">
      <div v-if="activeTool !== 'merge' && shouldShowUploader()" class="uploader-wrapper">
        <ImageUploader @upload="onFileUpload" />
      </div>

      <template v-if="activeTool === 'crop' && currentImage">
        <CropTool :image="currentImage" @clear="onClearImage" />
      </template>

      <template v-if="activeTool === 'rotate' && currentImage">
        <RotateTool :image="currentImage" @clear="onClearImage" />
      </template>

      <template v-if="activeTool === 'merge'">
        <MergeTool
          :images="mergeImages"
          @upload="onFileUpload"
          @remove="onRemoveMergeImage"
          @clear="onClearMergeImages"
        />
      </template>

      <template v-if="activeTool === 'resize' && currentImage">
        <ResizeTool :image="currentImage" @clear="onClearImage" />
      </template>
    </main>
    <ToastContainer />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.uploader-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  z-index: 40;
}

.light .mobile-header {
  background-color: var(--color-bg-light);
  border-bottom-color: var(--color-border-light);
}

.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--radius-md);
}

.menu-toggle:hover {
  background-color: var(--color-bg-hover);
}

.light .menu-toggle:hover {
  background-color: var(--color-bg-light-tertiary);
}

.mobile-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.light .mobile-title {
  color: var(--color-text-light-primary);
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .app-container {
    padding-top: 56px;
  }

  .mobile-header {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 45;
  }

  .sidebar {
    position: fixed;
    left: -200px;
    top: 0;
    z-index: 50;
    transition: left 0.3s ease;
  }

  .sidebar.mobile-open {
    left: 0;
  }
}

@media (min-width: 769px) {
  .menu-toggle {
    display: none;
  }
}
</style>
