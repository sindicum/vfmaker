import { useStore } from '@/stores/store'
import { useErrorStore } from '@/stores/errorStore'
import { ErrorSeverity, ErrorCategory } from '@/types/error'
import type { AppError } from '@/types/error'

export function useErrorHandler() {
  const store = useStore()
  const errorStore = useErrorStore()

  const handleError = (error: AppError) => {
    // エラーストアに追加
    errorStore.addError(error)

    // コンソールログ
    console.error(`[${error.category}] ${error.message}`, error.context)

    // ユーザー通知
    if (error.severity !== ErrorSeverity.LOW) {
      const alertType =
        error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
          ? 'Error'
          : 'Info'
      store.setMessage(alertType, error.userMessage)
    }

    // ネットワークエラーの場合は追加情報をログ
    if (error.category === ErrorCategory.NETWORK) {
      console.warn('ネットワークエラーが発生しました。接続を確認してください。')
    }
  }

  return { handleError }
}
