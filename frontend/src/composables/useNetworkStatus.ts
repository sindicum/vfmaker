import { ref, onMounted, onUnmounted } from 'vue'
import { useErrorHandler } from './useErrorHandler'
import { ErrorCategory, ErrorSeverity } from '@/types/error'
import type { AppError } from '@/types/error'

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)
  const { handleError } = useErrorHandler()

  const createNetworkError = (status: 'offline' | 'online'): AppError => ({
    id: `network_${status}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    category: ErrorCategory.NETWORK,
    severity: status === 'offline' ? ErrorSeverity.HIGH : ErrorSeverity.LOW,
    message: `ネットワーク状態変更: ${status}`,
    userMessage:
      status === 'offline'
        ? 'インターネット接続が切断されました。地図データの読み込みができません。'
        : 'インターネット接続が復旧しました。',
    timestamp: new Date(),
    context: { networkStatus: status, userAgent: navigator.userAgent },
  })

  const handleOnline = () => {
    isOnline.value = true
    handleError(createNetworkError('online'))
  }

  const handleOffline = () => {
    isOnline.value = false
    handleError(createNetworkError('offline'))
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    isOnline,
  }
}
