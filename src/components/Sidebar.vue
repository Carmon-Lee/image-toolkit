<script setup lang="ts">
import type { ToolType } from '../types'
import { useTheme } from '../composables/useTheme'
import { Crop, RotateCw, Columns2, Minimize2, Sun, Moon } from 'lucide-vue-next'

defineProps<{
  activeTool: ToolType
}>()

const emit = defineEmits<{
  change: [tool: ToolType]
}>()

const { isDark, toggle } = useTheme()

const tools: { key: ToolType; label: string; icon: any }[] = [
  { key: 'crop', label: '裁剪', icon: Crop },
  { key: 'rotate', label: '旋转', icon: RotateCw },
  { key: 'merge', label: '合并', icon: Columns2 },
  { key: 'resize', label: '压缩', icon: Minimize2 },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="var(--color-accent)"/>
          <path d="M7 18L12 12L15 15.5L18.5 11L21 18H7Z" fill="white" opacity="0.9"/>
          <circle cx="11" cy="10" r="2" fill="white" opacity="0.9"/>
        </svg>
        <span class="logo-text">ImageKit</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="tool in tools"
        :key="tool.key"
        class="nav-item"
        :class="{ active: activeTool === tool.key }"
        @click="emit('change', tool.key)"
      >
        <component :is="tool.icon" :size="20" :stroke-width="1.8" />
        <span>{{ tool.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <button class="theme-btn" @click="toggle" :title="isDark ? '切换亮色' : '切换暗色'">
        <Sun v-if="isDark" :size="18" :stroke-width="1.8" />
        <Moon v-else :size="18" :stroke-width="1.8" />
        <span>{{ isDark ? '亮色模式' : '暗色模式' }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  min-width: 200px;
  height: 100vh;
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease;
}

.light .sidebar {
  background-color: var(--color-bg-light);
  border-right-color: var(--color-border-light);
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--color-border);
}

.light .sidebar-header {
  border-bottom-color: var(--color-border-light);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.3px;
}

.light .logo-text {
  color: var(--color-text-light-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.light .nav-item:hover {
  background-color: var(--color-bg-light-tertiary);
  color: var(--color-text-light-primary);
}

.nav-item.active {
  background-color: var(--color-accent-subtle);
  color: var(--color-accent);
}

.light .nav-item.active {
  background-color: rgba(99, 102, 241, 0.08);
  color: var(--color-accent-light);
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--color-border);
}

.light .sidebar-footer {
  border-top-color: var(--color-border-light);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
  width: 100%;
}

.theme-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.light .theme-btn:hover {
  background-color: var(--color-bg-light-tertiary);
  color: var(--color-text-light-primary);
}
</style>
