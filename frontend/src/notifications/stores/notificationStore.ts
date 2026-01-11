import { ref, readonly } from 'vue'
import { defineStore } from 'pinia'

export type AlertType = 'Error' | 'Warn' | 'Info' | ''

export const useNotificationStore = defineStore('notification', () => {
  // === Alert（トースト）===
  const alert = ref<{ type: AlertType; message: string }>({
    type: '',
    message: '',
  })

  const showAlert = (type: AlertType, message: string) => {
    alert.value = { type, message }
  }

  const clearAlert = () => {
    alert.value = { type: '', message: '' }
  }

  // === NotificationDialog（モーダル）===
  const dialog = ref<{
    isOpen: boolean
    title: string
    message: string
    retryable: boolean
    onRetry: (() => void) | null
    onCancel: (() => void) | null
  }>({
    isOpen: false,
    title: '',
    message: '',
    retryable: false,
    onRetry: null,
    onCancel: null,
  })

  const showDialog = (options: {
    title?: string
    message: string
    retryable?: boolean
    onRetry?: () => void
    onCancel?: () => void
  }) => {
    dialog.value = {
      isOpen: true,
      title: options.title ?? 'エラー',
      message: options.message,
      retryable: options.retryable ?? false,
      onRetry: options.onRetry ?? null,
      onCancel: options.onCancel ?? null,
    }
  }

  const closeDialog = () => {
    dialog.value.isOpen = false
  }

  return {
    // Alert
    alert: readonly(alert),
    showAlert,
    clearAlert,
    // Dialog
    dialog: readonly(dialog),
    showDialog,
    closeDialog,
  }
})
