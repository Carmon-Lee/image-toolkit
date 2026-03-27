<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ImageFile } from '../../types'
import { Download, X, RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2 } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const props = defineProps<{ image: ImageFile }>()
const emit = defineEmits<{ clear: [] }>()
const { show } = useToast()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

const angle = ref(0)
const flipH = ref(false)
const flipV = ref(false)

let imgElement: HTMLImageElement | null = null

function calculateLayout() {
  if (!containerRef.value || !imgElement) return
  draw()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !imgElement || !containerRef.value) return
  const ctx = canvas.getContext('2d')!

  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  canvas.width = cw
  canvas.height = ch

  ctx.clearRect(0, 0, cw, ch)

  const radians = (angle.value * Math.PI) / 180
  const absCos = Math.abs(Math.cos(radians))
  const absSin = Math.abs(Math.sin(radians))

  // Rotated bounding box
  const rotW = props.image.width * absCos + props.image.height * absSin
  const rotH = props.image.width * absSin + props.image.height * absCos

  const padding = 40
  const availW = cw - padding * 2
  const availH = ch - padding * 2
  const scale = Math.min(availW / rotW, availH / rotH, 1)

  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.rotate(radians)
  ctx.scale(flipH.value ? -1 : 1, flipV.value ? -1 : 1)

  const dw = props.image.width * scale
  const dh = props.image.height * scale
  ctx.drawImage(imgElement, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

function rotate(deg: number) {
  angle.value = (angle.value + deg + 360) % 360
  draw()
}

function toggleFlipH() {
  flipH.value = !flipH.value
  draw()
}

function toggleFlipV() {
  flipV.value = !flipV.value
  draw()
}

function resetTransform() {
  angle.value = 0
  flipH.value = false
  flipV.value = false
  draw()
}

function doExport() {
  const radians = (angle.value * Math.PI) / 180
  const absCos = Math.abs(Math.cos(radians))
  const absSin = Math.abs(Math.sin(radians))
  const w = props.image.width
  const h = props.image.height

  const outW = Math.round(w * absCos + h * absSin)
  const outH = Math.round(w * absSin + h * absCos)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!

  ctx.translate(outW / 2, outH / 2)
  ctx.rotate(radians)
  ctx.scale(flipH.value ? -1 : 1, flipV.value ? -1 : 1)
  ctx.drawImage(imgElement!, -w / 2, -h / 2, w, h)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rotated_${props.image.name}`
    a.click()
    URL.revokeObjectURL(url)
    show('旋转/翻转完成，已下载')
  }, 'image/png')
}

function onAngleInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  angle.value = isNaN(val) ? 0 : val % 360
  draw()
}

onMounted(() => {
  imgElement = new Image()
  imgElement.onload = () => {
    calculateLayout()
  }
  imgElement.src = props.image.url
  window.addEventListener('resize', calculateLayout)
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateLayout)
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
        <h3>旋转 / 翻转</h3>
        <button class="icon-btn" @click="emit('clear')" title="移除图片">
          <X :size="18" />
        </button>
      </div>

      <div class="panel-section">
        <label class="field-label">快捷旋转</label>
        <div class="action-row">
          <button class="action-btn" @click="rotate(-90)" title="逆时针旋转90度">
            <RotateCcw :size="18" />
            <span>-90°</span>
          </button>
          <button class="action-btn" @click="rotate(90)" title="顺时针旋转90度">
            <RotateCw :size="18" />
            <span>+90°</span>
          </button>
          <button class="action-btn" @click="rotate(180)" title="旋转180度">
            <RotateCw :size="18" />
            <span>180°</span>
          </button>
        </div>
      </div>

      <div class="panel-section">
        <label class="field-label">自定义角度</label>
        <div class="angle-control">
          <input
            type="range"
            min="-180"
            max="180"
            :value="angle"
            @input="onAngleInput"
          />
          <div class="angle-value">
            <input
              type="number"
              class="input-field angle-input"
              :value="angle"
              @input="onAngleInput"
              min="-360"
              max="360"
            />
            <span class="angle-unit">°</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <label class="field-label">翻转</label>
        <div class="action-row">
          <button
            class="action-btn"
            :class="{ active: flipH }"
            @click="toggleFlipH"
          >
            <FlipHorizontal2 :size="18" />
            <span>水平翻转</span>
          </button>
          <button
            class="action-btn"
            :class="{ active: flipV }"
            @click="toggleFlipV"
          >
            <FlipVertical2 :size="18" />
            <span>垂直翻转</span>
          </button>
        </div>
      </div>

      <div class="panel-section">
        <button class="btn-secondary full-width" @click="resetTransform">
          重置
        </button>
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
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
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
    padding-bottom: 120px;
  }

  .settings-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: auto;
    min-width: auto;
    max-height: 70vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: 20;
    padding-bottom: env(safe-area-inset-bottom, 0px);
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

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.action-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.action-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.light .action-btn {
  border-color: var(--color-border-light);
  color: var(--color-text-light-secondary);
}

.angle-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.angle-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.angle-input {
  width: 80px;
  text-align: center;
}

.angle-unit {
  font-size: 14px;
  color: var(--color-text-muted);
}

.panel-actions {
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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
</style>
