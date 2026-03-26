import { ref } from 'vue'

const toasts = ref<Array<{ id: number; message: string; type: 'success' | 'error' }>>([])
let toastId = 0

export function useToast() {
  const show = (message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 3000)
  }

  return { toasts, show }
}
