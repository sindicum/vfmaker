import { useStore } from '@/stores/store'
import { useErrorStore } from '@/stores/errorStore'
import { ErrorSeverity, ErrorCategory } from './types'
import type { AppError, ErrorHandlerOptions } from './types'
import { DEFAULT_ERROR_MESSAGES } from './errorMessages'

// デフォルトオプション
const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  showUserNotification: true,
  logToConsole: true,
  logToStore: true,
  retry: {
    enabled: false,
    maxAttempts: 3,
    delay: 1000,
  },
}

export function useErrorHandler() {
  const store = useStore()
  const errorStore = useErrorStore()

  // エラーハンドリングのメイン関数
  const handleError = (error: AppError, options?: Partial<ErrorHandlerOptions>) => {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // エラーストアに追加
    if (opts.logToStore) {
      errorStore.addError(error)
    }

    // コンソールログ
    if (opts.logToConsole) {
      const logLevel = getLogLevel(error.severity)
      console[logLevel](
        `[${error.category.toUpperCase()}] ${error.message}`,
        {
          error: error.originalError,
          context: error.context,
          timestamp: error.timestamp,
        }
      )
    }

    // ユーザー通知
    if (opts.showUserNotification && error.severity !== ErrorSeverity.LOW) {
      const alertType = getAlertType(error.severity)
      store.setMessage(alertType, error.userMessage)
    }

    // カテゴリ別の追加処理
    handleCategorySpecificError(error, opts)
  }

  // エラー重要度に基づくログレベルを取得
  const getLogLevel = (severity: ErrorSeverity): 'log' | 'warn' | 'error' => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error'
      default:
        return 'error'
    }
  }

  // エラー重要度に基づくアラートタイプを取得
  const getAlertType = (severity: ErrorSeverity): 'Info' | 'Error' => {
    return severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL
      ? 'Error'
      : 'Info'
  }

  // カテゴリ別のエラー処理
  const handleCategorySpecificError = (error: AppError, opts: ErrorHandlerOptions) => {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        // ネットワークエラーの追加処理
        if (navigator.onLine === false && opts.logToConsole) {
          console.warn('オフライン状態です。ネットワーク接続を確認してください。')
        }
        break
      
      case ErrorCategory.PERMISSION:
        // 権限エラーの追加処理
        // 必要に応じて再認証画面へのリダイレクトなど
        break
      
      case ErrorCategory.VALIDATION:
        // バリデーションエラーの追加処理
        // フォームのエラー表示など
        break
      
      default:
        // その他のエラー
        break
    }
  }

  // リトライ機能付きエラーハンドリング
  const handleErrorWithRetry = async <T>(
    operation: () => Promise<T>,
    createError: (error: Error) => AppError,
    options?: Partial<ErrorHandlerOptions>
  ): Promise<T | undefined> => {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let lastError: Error | undefined

    if (!opts.retry?.enabled) {
      try {
        return await operation()
      } catch (error) {
        handleError(createError(error as Error), opts)
        throw error
      }
    }

    const maxAttempts = opts.retry.maxAttempts || 3
    const delay = opts.retry.delay || 1000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxAttempts) {
          if (opts.logToConsole) {
            console.warn(`リトライ ${attempt}/${maxAttempts} - ${delay}ms後に再試行します`)
          }
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }

    // 全てのリトライが失敗した場合
    if (lastError) {
      handleError(createError(lastError), opts)
      throw lastError
    }
  }

  // デフォルトエラーメッセージを取得
  const getDefaultErrorMessage = (category: ErrorCategory, severity: ErrorSeverity): string => {
    return DEFAULT_ERROR_MESSAGES[category]?.[severity] || 'エラーが発生しました'
  }

  return {
    handleError,
    handleErrorWithRetry,
    getDefaultErrorMessage,
  }
}