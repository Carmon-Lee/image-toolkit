export type ToolType = 'crop' | 'rotate' | 'merge' | 'resize'

export interface ImageFile {
  id: string
  name: string
  url: string
  file: File
  width: number
  height: number
}

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface RotateOptions {
  angle: number
  flipH: boolean
  flipV: boolean
}

export interface MergeOptions {
  direction: 'horizontal' | 'vertical'
  gap: number
  bgColor: string
}

export interface ResizeOptions {
  width: number
  height: number
  maintainAspectRatio: boolean
  format: 'png' | 'jpeg' | 'webp'
  quality: number
}
