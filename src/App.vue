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

function onToolChange(tool: ToolType) {
  activeTool.value = tool
}

function loadImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        id: crypto.randomUUID(),
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
    <Sidebar :activeTool="activeTool" @change="onToolChange" />
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
</style>
