import type { AppError } from '@/types/error'
import { ErrorCategory, ErrorSeverity } from '@/types/error'

const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

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
