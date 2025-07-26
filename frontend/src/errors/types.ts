export enum ErrorCategory {
  NETWORK = 'network',
  GEOSPATIAL = 'geospatial',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low', // 警告レベル
  MEDIUM = 'medium', // エラーだが継続可能
  HIGH = 'high', // 致命的エラー
  CRITICAL = 'critical', // システム停止レベル
}

export interface AppError {
  id: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  userMessage: string
  timestamp: Date
  context?: Record<string, unknown>
  originalError?: Error
}

// エラーハンドリングオプション
export interface ErrorHandlerOptions {
  showUserNotification?: boolean
  logToConsole?: boolean
  logToStore?: boolean
  retry?: {
    enabled: boolean
    maxAttempts?: number
    delay?: number
  }
}