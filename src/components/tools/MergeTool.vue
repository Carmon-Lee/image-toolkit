<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { ImageFile } from '../../types'
import { Download, Plus, Trash2, GripVertical } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'
import ImageUploader from '../ImageUploader.vue'

const props = defineProps<{ images: ImageFile[] }>()
const emit = defineEmits<{
  upload: [files: File[]]
  remove: [id: string]
  clear: []
}>()
const { show } = useToast()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

const direction = ref<'horizontal' | 'vertical'>('horizontal')
const gap = ref(0)
const bgColor = ref('#000000')

// Drag reorder state
const dragIdx = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !containerRef.value || props.images.length === 0) return
  const ctx = canvas.getContext('2d')!
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  canvas.width = cw
  canvas.height = ch

  ctx.clearRect(0, 0, cw, ch)

  // Calculate merged image size
  let totalW = 0
  let totalH = 0

  // We need to load images and draw
  const promises = props.images.map((img) => {
    return new Promise<HTMLImageElement>((resolve) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.src = img.url
    })
  })

  Promise.all(promises).then((imgs) => {
    if (direction.value === 'horizontal') {
      totalH = Math.max(...props.images.map(i => i.height))
      totalW = props.images.reduce((s, i) => s + i.width, 0) + gap.value * (props.images.length - 1)
    } else {
      totalW = Math.max(...props.images.map(i => i.width))
      totalH = props.images.reduce((s, i) => s + i.height, 0) + gap.value * (props.images.length - 1)
    }

    const padding = 40
    const scale = Math.min((cw - padding * 2) / totalW, (ch - padding * 2) / totalH, 1)
    const ox = (cw - totalW * scale) / 2
    const oy = (ch - totalH * scale) / 2

    // Background for gap area
    if (gap.value > 0) {
      ctx.fillStyle = bgColor.value
      ctx.fillRect(ox, oy, totalW * scale, totalH * scale)
    }

    let x = 0
    let y = 0
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i]
      const imgData = props.images[i]
      const dw = imgData.width * scale
      const dh = imgData.height * scale

      if (direction.value === 'horizontal') {
        const dy = oy + (totalH * scale - dh) / 2
        ctx.drawImage(img, ox + x * scale, dy, dw, dh)
        x += imgData.width + gap.value
      } else {
        const dx = ox + (totalW * scale - dw) / 2
        ctx.drawImage(img, dx, oy + y * scale, dw, dh)
        y += imgData.height + gap.value
      }
    }
  })
}

function doExport() {
  if (props.images.length === 0) return

  const promises = props.images.map((img) => {
    return new Promise<HTMLImageElement>((resolve) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.src = img.url
    })
  })

  Promise.all(promises).then((imgs) => {
    let totalW = 0
    let totalH = 0

    if (direction.value === 'horizontal') {
      totalH = Math.max(...props.images.map(i => i.height))
      totalW = props.images.reduce((s, i) => s + i.width, 0) + gap.value * (props.images.length - 1)
    } else {
      totalW = Math.max(...props.images.map(i => i.width))
      totalH = props.images.reduce((s, i) => s + i.height, 0) + gap.value * (props.images.length - 1)
    }

    const canvas = document.createElement('canvas')
    canvas.width = totalW
    canvas.height = totalH
    const ctx = canvas.getContext('2d')!

    if (gap.value > 0) {
      ctx.fillStyle = bgColor.value
      ctx.fillRect(0, 0, totalW, totalH)
    }

    let x = 0
    let y = 0
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i]
      const imgData = props.images[i]

      if (direction.value === 'horizontal') {
        const dy = (totalH - imgData.height) / 2
        ctx.drawImage(img, x, dy, imgData.width, imgData.height)
        x += imgData.width + gap.value
      } else {
        const dx = (totalW - imgData.width) / 2
        ctx.drawImage(img, dx, y, imgData.width, imgData.height)
        y += imgData.height + gap.value
      }
    }

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merged_${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      show('合并完成，已下载')
    }, 'image/png')
  })
}

function onDragStart(idx: number) {
  dragIdx.value = idx
}

function onDragOver(idx: number, e: DragEvent) {
  e.preventDefault()
  dragOverIdx.value = idx
}

function onDrop(idx: number) {
  if (dragIdx.value === null || dragIdx.value === idx) {
    dragIdx.value = null
    dragOverIdx.value = null
    return
  }

  // Reorder by swapping
  const images = [...props.images]
  const [moved] = images.splice(dragIdx.value, 1)
  images.splice(idx, 0, moved)

  // We need to mutate the parent's array - emit a reorder event
  // Since we're using the parent's array directly, we swap in place
  const source = dragIdx.value
  const target = idx
  const arr = props.images
  const item = arr[source]
  arr.splice(source, 1)
  arr.splice(target, 0, item)

  dragIdx.value = null
  dragOverIdx.value = null
  draw()
}

watch([() => props.images.length, direction, gap, bgColor], () => {
  draw()
})

onMounted(() => {
  draw()
  window.addEventListener('resize', draw)
})

onUnmounted(() => {
  window.removeEventListener('resize', draw)
})
</script>

<template>
  <div class="tool-layout">
    <div class="canvas-area" ref="containerRef">
      <canvas v-if="images.length > 0" ref="canvasRef" />
      <div v-else class="empty-merge">
        <ImageUploader :multiple="true" @upload="(files: File[]) => emit('upload', files)" />
      </div>
    </div>
    <div class="settings-panel">
      <div class="panel-header">
        <h3>合并设置</h3>
      </div>

      <div class="panel-section">
        <label class="field-label">排列方向</label>
        <div class="direction-row">
          <button
            class="direction-btn"
            :class="{ active: direction === 'horizontal' }"
            @click="direction = 'horizontal'"
          >
            横向
          </button>
          <button
            class="direction-btn"
            :class="{ active: direction === 'vertical' }"
            @click="direction = 'vertical'"
          >
            纵向
          </button>
        </div>
      </div>

      <div class="panel-section">
        <label class="field-label">间距 (px)</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="gap"
        />
        <div class="range-value">{{ gap }}px</div>
      </div>

      <div class="panel-section" v-if="gap > 0">
        <label class="field-label">间距背景色</label>
        <div class="color-row">
          <input type="color" v-model="bgColor" class="color-picker" />
          <span class="color-value">{{ bgColor }}</span>
        </div>
      </div>

      <div class="panel-section">
        <div class="flex-between">
          <label class="field-label">图片列表 ({{ images.length }})</label>
          <label class="add-btn" @click="($refs.addInput as HTMLInputElement)?.click()">
            <Plus :size="14" />
            添加
          </label>
          <input
            ref="addInput"
            type="file"
            multiple
            accept="image/*"
            hidden
            @change="(e: Event) => {
              const files = Array.from((e.target as HTMLInputElement).files ?? []).filter(f => f.type.startsWith('image/'));
              if (files.length) emit('upload', files);
              (e.target as HTMLInputElement).value = '';
            }"
          />
        </div>
        <div class="image-list">
          <div
            v-for="(img, idx) in images"
            :key="img.id"
            class="image-item"
            :class="{ 'drag-over': dragOverIdx === idx }"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover="onDragOver(idx, $event)"
            @drop="onDrop(idx)"
            @dragend="dragIdx = null; dragOverIdx = null"
          >
            <GripVertical :size="14" class="grip-icon" />
            <img :src="img.url" class="thumb" />
            <div class="image-info">
              <span class="image-name">{{ img.name.length > 12 ? img.name.slice(0, 12) + '...' : img.name }}</span>
              <span class="image-size">{{ img.width }}x{{ img.height }}</span>
            </div>
            <button class="remove-btn" @click="emit('remove', img.id)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div class="panel-actions" v-if="images.length > 0">
        <button class="btn-primary full-width" @click="doExport">
          <Download :size="16" />
          导出合并结果
        </button>
        <button class="btn-secondary full-width" style="margin-top: 8px" @click="emit('clear')">
          清空全部
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas-area canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.empty-merge {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  height: 100%;
}

.settings-panel {
  width: 260px;
  min-width: 260px;
  background-color: var(--color-bg-secondary);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.light .settings-panel {
  background-color: var(--color-bg-light);
  border-left-color: var(--color-border-light);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.light .panel-header {
  border-bottom-color: var(--color-border-light);
}

.panel-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.light .panel-header h3 {
  color: var(--color-text-light-primary);
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.light .panel-section {
  border-bottom-color: var(--color-border-light);
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.flex-between .field-label {
  margin-bottom: 0;
}

.direction-row {
  display: flex;
  gap: 8px;
}

.direction-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.direction-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.direction-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.light .direction-btn {
  border-color: var(--color-border-light);
  color: var(--color-text-light-secondary);
}

.range-value {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-picker {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 2px;
  background: transparent;
}

.color-value {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-accent);
  cursor: pointer;
  font-weight: 500;
}

.add-btn:hover {
  opacity: 0.8;
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  cursor: grab;
  transition: all 0.15s ease;
}

.light .image-item {
  background-color: var(--color-bg-light-secondary);
}

.image-item.drag-over {
  border: 1px dashed var(--color-accent);
}

.grip-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.image-info {
  flex: 1;
  min-width: 0;
}

.image-name {
  display: block;
  font-size: 12px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.light .image-name {
  color: var(--color-text-light-primary);
}

.image-size {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: var(--color-danger);
  background-color: rgba(248, 113, 113, 0.1);
}

.panel-actions {
  padding: 16px;
  margin-top: auto;
}

.full-width {
  width: 100%;
  justify-content: center;
}
</style>
