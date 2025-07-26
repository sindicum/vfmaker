import type { AppError } from './types'
import { ErrorCategory, ErrorSeverity } from './types'

const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// ネットワークエラー
export const createNetworkError = (
  operation: string,
  originalError?: Error,
  context?: Record<string, unknown>,
): AppError => ({
  id: generateErrorId(),
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.HIGH,
  message: `ネットワークエラー: ${operation}`,
  userMessage: 'ネットワーク接続に問題が発生しました。接続を確認して再試行してください。',
  timestamp: new Date(),
  context: { operation, ...context },
  originalError,
})

// 地理空間処理エラー
export const createGeospatialError = (
  operation: string,
  originalError: Error,
  context?: Record<string, unknown>,
): AppError => ({
  id: generateErrorId(),
  category: ErrorCategory.GEOSPATIAL,
  severity: ErrorSeverity.MEDIUM,
  message: `空間データ処理エラー: ${operation}`,
  userMessage: '地図データの処理中にエラーが発生しました。再試行してください。',
  timestamp: new Date(),
  context: { operation, ...context },
  originalError,
})

// バリデーションエラー
export const createValidationError = (
  field: string,
  value: unknown,
  requirement: string,
  context?: Record<string, unknown>,
): AppError => ({
  id: generateErrorId(),
  category: ErrorCategory.VALIDATION,
  severity: ErrorSeverity.LOW,
  message: `バリデーションエラー: ${field} - ${requirement}`,
  userMessage: `入力内容に問題があります: ${requirement}`,
  timestamp: new Date(),
  context: { field, value, requirement, ...context },
})

// 権限エラー
export const createPermissionError = (
  resource: string,
  action: string,
  context?: Record<string, unknown>,
): AppError => ({
  id: generateErrorId(),
  category: ErrorCategory.PERMISSION,
  severity: ErrorSeverity.HIGH,
  message: `権限エラー: ${resource}への${action}権限がありません`,
  userMessage: 'この操作を実行する権限がありません。',
  timestamp: new Date(),
  context: { resource, action, ...context },
})

// 汎用エラー
export const createGeneralError = (
  message: string,
  userMessage: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  originalError?: Error,
  context?: Record<string, unknown>,
): AppError => ({
  id: generateErrorId(),
  category: ErrorCategory.UNKNOWN,
  severity,
  message,
  userMessage,
  timestamp: new Date(),
  context,
  originalError,
})

// HTTPエラー（ステータスコードに基づく）
export const createHttpError = (
  status: number,
  url: string,
  method: string = 'GET',
  originalError?: Error,
  context?: Record<string, unknown>,
): AppError => {
  let userMessage = 'リクエストの処理中にエラーが発生しました。'
  let severity = ErrorSeverity.MEDIUM

  if (status >= 400 && status < 500) {
    if (status === 401) {
      userMessage = '認証エラーが発生しました。再度ログインしてください。'
      severity = ErrorSeverity.HIGH
    } else if (status === 403) {
      return createPermissionError(url, method, { status, ...context })
    } else if (status === 404) {
      userMessage = '要求されたリソースが見つかりません。'
    } else if (status === 429) {
      userMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください。'
    }
  } else if (status >= 500) {
    userMessage = 'サーバーエラーが発生しました。時間をおいて再試行してください。'
    severity = ErrorSeverity.HIGH
  }

  return {
    id: generateErrorId(),
    category: ErrorCategory.NETWORK,
    severity,
    message: `HTTPエラー ${status}: ${method} ${url}`,
    userMessage,
    timestamp: new Date(),
    context: { status, url, method, ...context },
    originalError,
  }
}