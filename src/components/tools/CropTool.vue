<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import type { ImageFile } from '../../types'
import { Download, X, Lock, Unlock } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

type CropShape = 'rect' | 'circle' | 'ellipse' | 'rounded-rect'

const props = defineProps<{ image: ImageFile }>()
const emit = defineEmits<{ clear: [] }>()
const { show } = useToast()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

// Crop region in image coordinates
const cropX = ref(0)
const cropY = ref(0)
const cropW = ref(0)
const cropH = ref(0)
const lockRatio = ref(false)
const aspectRatio = ref(1)

// Shape
const cropShape = ref<CropShape>('rect')
const borderRadius = ref(20)

// Display scale
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)

// Dragging state
const dragging = ref<string | null>(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartCropX = ref(0)
const dragStartCropY = ref(0)
const dragStartCropW = ref(0)
const dragStartCropH = ref(0)

let imgElement: HTMLImageElement | null = null

const shapes: { key: CropShape; label: string }[] = [
  { key: 'rect', label: '矩形' },
  { key: 'rounded-rect', label: '圆角' },
  { key: 'circle', label: '圆形' },
  { key: 'ellipse', label: '椭圆' },
]

function setShape(shape: CropShape) {
  cropShape.value = shape
  if (shape === 'circle') {
    // Force 1:1 ratio for circle
    lockRatio.value = true
    aspectRatio.value = 1
    const size = Math.min(cropW.value, cropH.value)
    const cx = cropX.value + cropW.value / 2
    const cy = cropY.value + cropH.value / 2
    cropW.value = Math.round(size)
    cropH.value = Math.round(size)
    cropX.value = Math.round(Math.max(0, Math.min(cx - size / 2, props.image.width - size)))
    cropY.value = Math.round(Math.max(0, Math.min(cy - size / 2, props.image.height - size)))
  }
  draw()
}

/** Build a shape path on ctx at given screen coords */
function buildShapePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  switch (cropShape.value) {
    case 'circle': {
      const r = Math.min(w, h) / 2
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2)
      break
    }
    case 'ellipse': {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      break
    }
    case 'rounded-rect': {
      const maxR = Math.min(w, h) / 2
      const r = Math.min(borderRadius.value * scale.value, maxR)
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      break
    }
    default:
      ctx.rect(x, y, w, h)
  }
  ctx.closePath()
}

/** Build shape path in image (export) coordinates */
function buildExportShapePath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath()
  switch (cropShape.value) {
    case 'circle': {
      const r = Math.min(w, h) / 2
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
      break
    }
    case 'ellipse': {
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      break
    }
    case 'rounded-rect': {
      const maxR = Math.min(w, h) / 2
      const r = Math.min(borderRadius.value, maxR)
      ctx.moveTo(r, 0)
      ctx.lineTo(w - r, 0)
      ctx.quadraticCurveTo(w, 0, w, r)
      ctx.lineTo(w, h - r)
      ctx.quadraticCurveTo(w, h, w - r, h)
      ctx.lineTo(r, h)
      ctx.quadraticCurveTo(0, h, 0, h - r)
      ctx.lineTo(0, r)
      ctx.quadraticCurveTo(0, 0, r, 0)
      break
    }
    default:
      ctx.rect(0, 0, w, h)
  }
  ctx.closePath()
}

function initCrop() {
  const margin = 0.15
  cropX.value = Math.round(props.image.width * margin)
  cropY.value = Math.round(props.image.height * margin)
  cropW.value = Math.round(props.image.width * (1 - 2 * margin))
  cropH.value = Math.round(props.image.height * (1 - 2 * margin))
  aspectRatio.value = cropW.value / cropH.value
}

function calculateLayout() {
  if (!containerRef.value) return
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  const padding = 40

  const availW = cw - padding * 2
  const availH = ch - padding * 2

  scale.value = Math.min(availW / props.image.width, availH / props.image.height, 1)
  offsetX.value = (cw - props.image.width * scale.value) / 2
  offsetY.value = (ch - props.image.height * scale.value) / 2
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !imgElement) return
  const ctx = canvas.getContext('2d')!
  const cw = containerRef.value?.clientWidth ?? 800
  const ch = containerRef.value?.clientHeight ?? 600
  canvas.width = cw
  canvas.height = ch

  ctx.clearRect(0, 0, cw, ch)

  // Draw image
  const dw = props.image.width * scale.value
  const dh = props.image.height * scale.value
  ctx.drawImage(imgElement, offsetX.value, offsetY.value, dw, dh)

  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(offsetX.value, offsetY.value, dw, dh)

  // Clear crop region (show original) using shape clip
  const sx = offsetX.value + cropX.value * scale.value
  const sy = offsetY.value + cropY.value * scale.value
  const sw = cropW.value * scale.value
  const sh = cropH.value * scale.value

  ctx.save()
  buildShapePath(ctx, sx, sy, sw, sh)
  ctx.clip()
  ctx.drawImage(imgElement, offsetX.value, offsetY.value, dw, dh)
  ctx.restore()

  // Shape border
  ctx.strokeStyle = 'rgba(124, 92, 252, 0.8)'
  ctx.lineWidth = 2
  buildShapePath(ctx, sx, sy, sw, sh)
  ctx.stroke()

  // Grid lines (rule of thirds) - only for rect/rounded-rect
  if (cropShape.value === 'rect' || cropShape.value === 'rounded-rect') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(sx + (sw / 3) * i, sy)
      ctx.lineTo(sx + (sw / 3) * i, sy + sh)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(sx, sy + (sh / 3) * i)
      ctx.lineTo(sx + sw, sy + (sh / 3) * i)
      ctx.stroke()
    }
  }

  // For circle/ellipse draw crosshair guides
  if (cropShape.value === 'circle' || cropShape.value === 'ellipse') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    // Horizontal center
    ctx.beginPath()
    ctx.moveTo(sx, sy + sh / 2)
    ctx.lineTo(sx + sw, sy + sh / 2)
    ctx.stroke()
    // Vertical center
    ctx.beginPath()
    ctx.moveTo(sx + sw / 2, sy)
    ctx.lineTo(sx + sw / 2, sy + sh)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Bounding box dashed outline for non-rect shapes
  if (cropShape.value !== 'rect') {
    ctx.strokeStyle = 'rgba(124, 92, 252, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(sx, sy, sw, sh)
    ctx.setLineDash([])
  }

  // Corner handles
  const handleSize = 10
  ctx.fillStyle = '#7c5cfc'
  const corners = [
    [sx, sy], [sx + sw, sy],
    [sx, sy + sh], [sx + sw, sy + sh],
  ]
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
  }

  // Edge midpoint handles (hide for circle since ratio is locked)
  if (cropShape.value !== 'circle') {
    const edges = [
      [sx + sw / 2, sy], [sx + sw / 2, sy + sh],
      [sx, sy + sh / 2], [sx + sw, sy + sh / 2],
    ]
    ctx.fillStyle = 'rgba(124, 92, 252, 0.7)'
    for (const [cx, cy] of edges) {
      ctx.fillRect(cx - 4, cy - 4, 8, 8)
    }
  }
}

function getHandle(mx: number, my: number): string | null {
  const sx = offsetX.value + cropX.value * scale.value
  const sy = offsetY.value + cropY.value * scale.value
  const sw = cropW.value * scale.value
  const sh = cropH.value * scale.value
  const t = 10

  // Corners
  if (Math.abs(mx - sx) < t && Math.abs(my - sy) < t) return 'tl'
  if (Math.abs(mx - (sx + sw)) < t && Math.abs(my - sy) < t) return 'tr'
  if (Math.abs(mx - sx) < t && Math.abs(my - (sy + sh)) < t) return 'bl'
  if (Math.abs(mx - (sx + sw)) < t && Math.abs(my - (sy + sh)) < t) return 'br'

  // Edges (not for circle)
  if (cropShape.value !== 'circle') {
    if (Math.abs(my - sy) < t && mx > sx + t && mx < sx + sw - t) return 't'
    if (Math.abs(my - (sy + sh)) < t && mx > sx + t && mx < sx + sw - t) return 'b'
    if (Math.abs(mx - sx) < t && my > sy + t && my < sy + sh - t) return 'l'
    if (Math.abs(mx - (sx + sw)) < t && my > sy + t && my < sy + sh - t) return 'r'
  }

  // Inside crop - check bounding box
  if (mx > sx && mx < sx + sw && my > sy && my < sy + sh) return 'move'

  return null
}

function onMouseDown(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const handle = getHandle(mx, my)
  if (!handle) return

  dragging.value = handle
  dragStartX.value = mx
  dragStartY.value = my
  dragStartCropX.value = cropX.value
  dragStartCropY.value = cropY.value
  dragStartCropW.value = cropW.value
  dragStartCropH.value = cropH.value
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0]
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const mx = touch.clientX - rect.left
  const my = touch.clientY - rect.top
  const handle = getHandle(mx, my)
  if (!handle) return

  dragging.value = handle
  dragStartX.value = mx
  dragStartY.value = my
  dragStartCropX.value = cropX.value
  dragStartCropY.value = cropY.value
  dragStartCropW.value = cropW.value
  dragStartCropH.value = cropH.value
}

function onMouseMove(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  // Update cursor
  if (!dragging.value) {
    const handle = getHandle(mx, my)
    const cursors: Record<string, string> = {
      tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize',
      t: 'ns-resize', b: 'ns-resize', l: 'ew-resize', r: 'ew-resize',
      move: 'move',
    }
    canvasRef.value!.style.cursor = handle ? cursors[handle] : 'default'
    return
  }

  const dx = (mx - dragStartX.value) / scale.value
  const dy = (my - dragStartY.value) / scale.value

  const imgW = props.image.width
  const imgH = props.image.height
  const minSize = 20

  if (dragging.value === 'move') {
    let nx = dragStartCropX.value + dx
    let ny = dragStartCropY.value + dy
    nx = Math.max(0, Math.min(nx, imgW - dragStartCropW.value))
    ny = Math.max(0, Math.min(ny, imgH - dragStartCropH.value))
    cropX.value = Math.round(nx)
    cropY.value = Math.round(ny)
  } else {
    let nx = dragStartCropX.value
    let ny = dragStartCropY.value
    let nw = dragStartCropW.value
    let nh = dragStartCropH.value

    if (dragging.value.includes('l')) { nx += dx; nw -= dx }
    if (dragging.value.includes('r')) { nw += dx }
    if (dragging.value.includes('t')) { ny += dy; nh -= dy }
    if (dragging.value.includes('b')) { nh += dy }

    // Lock aspect ratio for circle always, or when lockRatio is on for corner drags
    const forceRatio = cropShape.value === 'circle' || (lockRatio.value && dragging.value.length === 2)
    if (forceRatio && dragging.value.length === 2) {
      const targetRatio = aspectRatio.value
      if (Math.abs(nw / nh - targetRatio) > 0.01) {
        nh = nw / targetRatio
      }
    }

    // Clamp
    if (nw < minSize) nw = minSize
    if (nh < minSize) nh = minSize
    if (nx < 0) { nw += nx; nx = 0 }
    if (ny < 0) { nh += ny; ny = 0 }
    if (nx + nw > imgW) nw = imgW - nx
    if (ny + nh > imgH) nh = imgH - ny

    cropX.value = Math.round(nx)
    cropY.value = Math.round(ny)
    cropW.value = Math.round(nw)
    cropH.value = Math.round(nh)
  }

  draw()
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0]
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect || !dragging.value) return
  const mx = touch.clientX - rect.left
  const my = touch.clientY - rect.top

  const dx = (mx - dragStartX.value) / scale.value
  const dy = (my - dragStartY.value) / scale.value

  const imgW = props.image.width
  const imgH = props.image.height
  const minSize = 20

  if (dragging.value === 'move') {
    let nx = dragStartCropX.value + dx
    let ny = dragStartCropY.value + dy
    nx = Math.max(0, Math.min(nx, imgW - dragStartCropW.value))
    ny = Math.max(0, Math.min(ny, imgH - dragStartCropH.value))
    cropX.value = Math.round(nx)
    cropY.value = Math.round(ny)
  } else {
    let nx = dragStartCropX.value
    let ny = dragStartCropY.value
    let nw = dragStartCropW.value
    let nh = dragStartCropH.value

    if (dragging.value.includes('l')) { nx += dx; nw -= dx }
    if (dragging.value.includes('r')) { nw += dx }
    if (dragging.value.includes('t')) { ny += dy; nh -= dy }
    if (dragging.value.includes('b')) { nh += dy }

    // Lock aspect ratio for circle always, or when lockRatio is on for corner drags
    const forceRatio = cropShape.value === 'circle' || (lockRatio.value && dragging.value.length === 2)
    if (forceRatio && dragging.value.length === 2) {
      const targetRatio = aspectRatio.value
      if (Math.abs(nw / nh - targetRatio) > 0.01) {
        nh = nw / targetRatio
      }
    }

    // Clamp
    if (nw < minSize) nw = minSize
    if (nh < minSize) nh = minSize
    if (nx < 0) { nw += nx; nx = 0 }
    if (ny < 0) { nh += ny; ny = 0 }
    if (nx + nw > imgW) nw = imgW - nx
    if (ny + nh > imgH) nh = imgH - ny

    cropX.value = Math.round(nx)
    cropY.value = Math.round(ny)
    cropW.value = Math.round(nw)
    cropH.value = Math.round(nh)
  }

  draw()
}

function onMouseUp() {
  dragging.value = null
}

function onTouchEnd() {
  dragging.value = null
}

function doCrop() {
  const w = cropW.value
  const h = cropH.value
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // For non-rect shapes, apply shape clipping (export as PNG with transparency)
  if (cropShape.value !== 'rect') {
    buildExportShapePath(ctx, w, h)
    ctx.clip()
  }

  ctx.drawImage(
    imgElement!,
    cropX.value, cropY.value, w, h,
    0, 0, w, h
  )

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const baseName = props.image.name.replace(/\.[^.]+$/, '')
    a.download = `cropped_${baseName}.png`
    a.click()
    URL.revokeObjectURL(url)
    show('裁剪完成，已下载')
  }, 'image/png')
}

const displayCropInfo = computed(() => ({
  x: cropX.value,
  y: cropY.value,
  w: cropW.value,
  h: cropH.value,
}))

const isSettingsPanelOpen = ref(true)

onMounted(() => {
  imgElement = new Image()
  imgElement.onload = () => {
    initCrop()
    calculateLayout()
    draw()
  }
  imgElement.src = props.image.url

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('resize', () => { calculateLayout(); draw() })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

function toggleLockRatio() {
  if (cropShape.value === 'circle') return // circle always locked
  lockRatio.value = !lockRatio.value
  if (lockRatio.value) {
    aspectRatio.value = cropW.value / cropH.value
  }
}

function setPresetRatio(w: number, h: number) {
  lockRatio.value = true
  aspectRatio.value = w / h
  const centerX = cropX.value + cropW.value / 2
  const centerY = cropY.value + cropH.value / 2
  let newW = cropW.value
  let newH = newW / aspectRatio.value
  if (newH > props.image.height * 0.9) {
    newH = props.image.height * 0.9
    newW = newH * aspectRatio.value
  }
  cropW.value = Math.round(newW)
  cropH.value = Math.round(newH)
  cropX.value = Math.round(Math.max(0, Math.min(centerX - newW / 2, props.image.width - newW)))
  cropY.value = Math.round(Math.max(0, Math.min(centerY - newH / 2, props.image.height - newH)))
  draw()
}

watch(borderRadius, () => draw())
</script>

<template>
  <div class="tool-layout">
    <div class="canvas-area" ref="containerRef">
      <canvas
        ref="canvasRef"
        @mousedown="onMouseDown"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      />
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
        <h3>裁剪设置</h3>
        <button class="icon-btn" @click="emit('clear')" title="移除图片">
          <X :size="18" />
        </button>
      </div>

      <div class="panel-section">
        <label class="field-label">裁剪形状</label>
        <div class="shape-row">
          <button
            v-for="s in shapes"
            :key="s.key"
            class="shape-btn"
            :class="{ active: cropShape === s.key }"
            @click="setShape(s.key)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="panel-section" v-if="cropShape === 'rounded-rect'">
        <label class="field-label">圆角半径 {{ borderRadius }}px</label>
        <input
          type="range"
          min="1"
          :max="Math.round(Math.min(cropW, cropH) / 2)"
          v-model.number="borderRadius"
        />
      </div>

      <div class="panel-section">
        <label class="field-label">裁剪区域</label>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">X</span>
            <span class="info-value">{{ displayCropInfo.x }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Y</span>
            <span class="info-value">{{ displayCropInfo.y }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">宽</span>
            <span class="info-value">{{ displayCropInfo.w }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">高</span>
            <span class="info-value">{{ displayCropInfo.h }}</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="flex-between">
          <label class="field-label">锁定比例</label>
          <button class="icon-btn small" @click="toggleLockRatio">
            <Lock v-if="lockRatio || cropShape === 'circle'" :size="16" />
            <Unlock v-else :size="16" />
          </button>
        </div>
        <div class="ratio-presets">
          <button class="ratio-btn" @click="setPresetRatio(1, 1)">1:1</button>
          <button class="ratio-btn" @click="setPresetRatio(4, 3)">4:3</button>
          <button class="ratio-btn" @click="setPresetRatio(16, 9)">16:9</button>
          <button class="ratio-btn" @click="setPresetRatio(3, 4)">3:4</button>
          <button class="ratio-btn" @click="setPresetRatio(9, 16)">9:16</button>
        </div>
      </div>

      <div class="panel-section">
        <label class="field-label">原始尺寸</label>
        <p class="info-text">{{ image.width }} x {{ image.height }}</p>
      </div>

      <div class="panel-section" v-if="cropShape !== 'rect'">
        <p class="info-hint">非矩形裁剪将导出为 PNG 格式（透明背景）</p>
      </div>

      <div class="panel-actions">
        <button class="btn-primary full-width" @click="doCrop">
          <Download :size="16" />
          导出裁剪结果
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

.shape-row {
  display: flex;
  gap: 6px;
}

.shape-btn {
  flex: 1;
  padding: 7px 4px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  text-align: center;
}

.shape-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.shape-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.light .shape-btn {
  border-color: var(--color-border-light);
  color: var(--color-text-light-secondary);
}

.light .shape-btn.active {
  border-color: var(--color-accent-light);
  color: var(--color-accent-light);
  background-color: rgba(99, 102, 241, 0.08);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

.light .info-item {
  background-color: var(--color-bg-light-secondary);
}

.info-label {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.light .info-value {
  color: var(--color-text-light-primary);
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

.ratio-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ratio-btn {
  padding: 5px 12px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ratio-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
}

.light .ratio-btn {
  border-color: var(--color-border-light);
  color: var(--color-text-light-secondary);
}

.light .ratio-btn:hover {
  border-color: var(--color-accent-light);
  color: var(--color-accent-light);
}

.info-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.info-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
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
