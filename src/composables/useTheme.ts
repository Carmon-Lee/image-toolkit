import { ref, watch } from 'vue'

const isDark = ref(true)

export function useTheme() {
  const init = () => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      isDark.value = false
    }
    applyTheme()
  }

  const toggle = () => {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  const applyTheme = () => {
    if (isDark.value) {
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
    }
  }

  watch(isDark, applyTheme)

  return { isDark, toggle, init }
}
