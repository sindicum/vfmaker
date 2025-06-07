import { useErrorHandler } from '@/composables/useErrorHandler'
import { ErrorCategory, ErrorSeverity } from '@/types/error'

import type { AppError } from '@/types/error'

const generateErrorId = (): string => {
  return `api_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

const createNetworkError = (
  operation: string,
  originalError: Error,
  context?: Record<string, unknown>,
): AppError => ({
  id: generateErrorId(),
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.MEDIUM,
  message: `ネットワークエラー: ${operation}`,
  userMessage: 'サーバーとの通信に失敗しました。しばらく待ってから再試行してください。',
  timestamp: new Date(),
  context: { operation, ...context },
  originalError,
})

export const apiClient = {
  async post<T>(url: string, data: unknown): Promise<T> {
    const { handleError } = useErrorHandler()
    const maxRetries = 3
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) {
          handleError(
            createNetworkError('api_request_failed', lastError, { url, attempt, maxRetries }),
          )
          throw lastError
        }

        // 指数バックオフでリトライ
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    // この行は到達しないが、TypeScriptの要求を満たすために追加
    throw lastError!
  },
}
