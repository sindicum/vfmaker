import { ref, onMounted, onUnmounted } from 'vue'
import { useErrorHandler, createNetworkError, ErrorSeverity } from '@/errors'

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)
  const { handleError } = useErrorHandler()

  const handleOnline = () => {
    isOnline.value = true
    const error = createNetworkError('network_online', new Error('ネットワーク状態変更: online'), {
      networkStatus: 'online',
      userAgent: navigator.userAgent,
    })
    handleError({
      ...error,
      severity: ErrorSeverity.LOW,
      userMessage: 'インターネット接続が復旧しました。',
    })
  }

  const handleOffline = () => {
    isOnline.value = false
    const error = createNetworkError(
      'network_offline',
      new Error('Network connection lost'),
      { networkStatus: 'offline', userAgent: navigator.userAgent },
    )
    handleError({
      ...error,
      severity: ErrorSeverity.HIGH,
      userMessage: 'インターネット接続が切断されました。地図データの読み込みができません。',
    })
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
