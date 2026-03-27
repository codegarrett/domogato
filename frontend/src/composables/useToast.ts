import { ref } from 'vue'

interface ToastMessage {
  severity: 'success' | 'info' | 'warn' | 'error'
  summary: string
  detail: string
  life?: number
}

const pendingMessages = ref<ToastMessage[]>([])
let toastInstance: any = null

export function registerToast(toast: any) {
  toastInstance = toast
  for (const msg of pendingMessages.value) {
    toastInstance.add(msg)
  }
  pendingMessages.value = []
}

export function useToastService() {
  function add(msg: ToastMessage) {
    if (toastInstance) {
      toastInstance.add(msg)
    } else {
      pendingMessages.value.push(msg)
    }
  }

  return {
    showSuccess(summary: string, detail: string) {
      add({ severity: 'success', summary, detail, life: 4000 })
    },
    showError(summary: string, detail: string) {
      add({ severity: 'error', summary, detail, life: 8000 })
    },
    showWarn(summary: string, detail: string) {
      add({ severity: 'warn', summary, detail, life: 5000 })
    },
    showInfo(summary: string, detail: string) {
      add({ severity: 'info', summary, detail, life: 4000 })
    },
  }
}
