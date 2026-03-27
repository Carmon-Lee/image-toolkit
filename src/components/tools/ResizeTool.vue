<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { ImageFile } from '../../types'
import { Download, X, Link, Unlink } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const props = defineProps<{ image: ImageFile }>()
const emit = defineEmits<{ clear: [] }>()
const { show } = useToast()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

const outputWidth = ref(props.image.width)
const outputHeight = ref(props.image.height)
const maintainRatio = ref(true)
const format = ref<'png' | 'jpeg' | 'webp'>('png')
const quality = ref(85)

const originalRatio = computed(() => props.image.width / props.image.height)

let imgElement: HTMLImageElement | null = null

function onWidthChange(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (isNaN(val) || val <= 0) return
  outputWidth.value = val
  if (maintainRatio.value) {
    outputHeight.value = Math.round(val / originalRatio.value)
  }
}

function onHeightChange(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (isNaN(val) || val <= 0) return
  outputHeight.value = val
  if (maintainRatio.value) {
    outputWidth.value = Math.round(val * originalRatio.value)
  }
}

function setScalePercent(pct: number) {
  outputWidth.value = Math.round(props.image.width * pct / 100)
  outputHeight.value = Math.round(props.image.height * pct / 100)
}

const estimatedSize = computed(() => {
  const pixels = outputWidth.value * outputHeight.value
  let bytesPerPixel: number
  switch (format.value) {
    case 'png': bytesPerPixel = 2.5; break
    case 'jpeg': bytesPerPixel = 0.5 * (quality.value / 100); break
    case 'webp': bytesPerPixel = 0.3 * (quality.value / 100); break
    default: bytesPerPixel = 1
  }
  const bytes = pixels * bytesPerPixel
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
})

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !imgElement || !containerRef.value) return
  const ctx = canvas.getContext('2d')!
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  canvas.width = cw
  canvas.height = ch

  ctx.clearRect(0, 0, cw, ch)

  const padding = 40
  const scale = Math.min(
    (cw - padding * 2) / props.image.width,
    (ch - padding * 2) / props.image.height,
    1
  )
  const dw = props.image.width * scale
  const dh = props.image.height * scale
  const ox = (cw - dw) / 2
  const oy = (ch - dh) / 2

  ctx.drawImage(imgElement, ox, oy, dw, dh)

  // Draw output size overlay indicator
  const pctText = `${Math.round(outputWidth.value / props.image.width * 100)}%`

  ctx.fillStyle = 'rgba(124, 92, 252, 0.15)'
  ctx.fillRect(ox, oy, dw, dh)

  ctx.font = '14px -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.textAlign = 'center'
  ctx.fillText(`${outputWidth.value} × ${outputHeight.value}  (${pctText})`, cw / 2, oy + dh + 24)
}

function doExport() {
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth.value
  canvas.height = outputHeight.value
  const ctx = canvas.getContext('2d')!

  // Use high quality resampling
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imgElement!, 0, 0, outputWidth.value, outputHeight.value)

  const mimeType = `image/${format.value}`
  const q = format.value === 'png' ? undefined : quality.value / 100

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const baseName = props.image.name.replace(/\.[^.]+$/, '')
    a.download = `${baseName}_${outputWidth.value}x${outputHeight.value}.${format.value === 'jpeg' ? 'jpg' : format.value}`
    a.click()
    URL.revokeObjectURL(url)
    const sizeKb = (blob.size / 1024).toFixed(1)
    show(`导出完成 (${sizeKb} KB)`)
  }, mimeType, q)
}

watch([outputWidth, outputHeight], draw)

onMounted(() => {
  imgElement = new Image()
  imgElement.onload = () => draw()
  imgElement.src = props.image.url
  window.addEventListener('resize', draw)
})

onUnmounted(() => {
  window.removeEventListener('resize', draw)
})

const isSettingsPanelOpen = ref(true)
</script>

<template>
  <div class="tool-layout">
    <div class="canvas-area" ref="containerRef">
      <canvas ref="canvasRef" />
      <button
        class="mobile-settings-toggle"
        @click="isSettingsPanelOpen = !isSettingsPanelOpen"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
    <div
      class="settings-panel"
      :class="{ 'mobile-open': isSettingsPanelOpen }"
    >
      <div class="panel-header">
        <h3>调整大小</h3>
        <button class="icon-btn" @click="emit('clear')" title="移除图片">
          <X :size="18" />
        </button>
      </div>

      <div class="panel-section">
        <label class="field-label">原始尺寸</label>
        <p class="info-text">{{ image.width }} × {{ image.height }}</p>
      </div>

      <div class="panel-section">
        <div class="flex-between">
          <label class="field-label">输出尺寸</label>
          <button class="icon-btn small" @click="maintainRatio = !maintainRatio" :title="maintainRatio ? '解除比例锁定' : '锁定比例'">
            <Link v-if="maintainRatio" :size="16" />
            <Unlink v-else :size="16" />
          </button>
        </div>
        <div class="size-inputs">
          <div class="size-input-group">
            <label class="size-label">宽</label>
            <input
              type="number"
              class="input-field"
              :value="outputWidth"
              @input="onWidthChange"
              min="1"
            />
          </div>
          <span class="size-separator">×</span>
          <div class="size-input-group">
            <label class="size-label">高</label>
            <input
              type="number"
              class="input-field"
              :value="outputHeight"
              @input="onHeightChange"
              min="1"
            />
          </div>
        </div>
      </div>

      <div class="panel-section">
        <label class="field-label">快捷缩放</label>
        <div class="preset-row">
          <button class="preset-btn" @click="setScalePercent(25)">25%</button>
          <button class="preset-btn" @click="setScalePercent(50)">50%</button>
          <button class="preset-btn" @click="setScalePercent(75)">75%</button>
          <button class="preset-btn" @click="setScalePercent(100)">100%</button>
        </div>
      </div>

      <div class="panel-section">
        <label class="field-label">输出格式</label>
        <select class="select-field" v-model="format">
          <option value="png">PNG (无损)</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </div>

      <div class="panel-section" v-if="format !== 'png'">
        <label class="field-label">质量 {{ quality }}%</label>
        <input type="range" min="10" max="100" v-model.number="quality" />
      </div>

      <div class="panel-section">
        <label class="field-label">预计大小</label>
        <p class="info-text">约 {{ estimatedSize }}</p>
      </div>

      <div class="panel-actions">
        <button class="btn-primary full-width" @click="doExport">
          <Download :size="16" />
          导出结果
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

.mobile-settings-toggle {
  display: flex;
  position: absolute;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background-color: var(--color-accent);
  color: white;
  cursor: pointer;
  z-index: 100;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(124, 92, 252, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mobile-settings-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(124, 92, 252, 0.5);
}

.mobile-settings-toggle:active {
  transform: scale(0.95);
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

@media (max-width: 768px) {
  .tool-layout {
    flex-direction: column;
  }

  .canvas-area {
    flex: 1;
  }

  .settings-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: auto;
    min-width: auto;
    max-height: 60vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: 20;
  }

  .settings-panel.mobile-open {
    transform: translateY(0);
  }

  .light .settings-panel {
    border-left: none;
    border-top-color: var(--color-border-light);
  }
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

.info-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.size-inputs {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.size-input-group {
  flex: 1;
}

.size-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.size-separator {
  color: var(--color-text-muted);
  font-size: 16px;
  padding-bottom: 8px;
}

.preset-row {
  display: flex;
  gap: 6px;
}

.preset-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.light .preset-btn {
  border-color: var(--color-border-light);
  color: var(--color-text-light-secondary);
}

.panel-actions {
  padding: 16px;
  margin-top: auto;
}

.full-width {
  width: 100%;
  justify-content: center;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.icon-btn.small {
  width: 28px;
  height: 28px;
}
</style>
