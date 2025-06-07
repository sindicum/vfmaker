import { useErrorHandler } from '@/composables/useErrorHandler'
import { createGeospatialError } from '@/utils/errorFactories'
import { ErrorCategory, ErrorSeverity } from '@/types/error'
import type { AppError } from '@/types/error'

/**
 * エラーハンドリングの動作確認用サンプル関数
 * 開発時やデバッグ時に各種エラーの動作を確認するために使用
 */
export function demonstrateErrorHandling() {
  const { handleError } = useErrorHandler()

  // 1. 地理空間データエラーのテスト
  console.log('=== 地理空間データエラーのテスト ===')
  try {
    throw new Error('Invalid GeoJSON format')
  } catch (error) {
    const geospatialError = createGeospatialError(
      'GeoJSON parsing',
      error as Error,
      { fileName: 'test.geojson', lineNumber: 42 }
    )
    handleError(geospatialError)
  }

  // 2. ネットワークエラーのテスト
  console.log('=== ネットワークエラーのテスト ===')
  const networkError: AppError = {
    id: `network_error_${Date.now()}`,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'API request failed: 500 Internal Server Error',
    userMessage: 'サーバーとの通信に失敗しました。しばらく待ってから再試行してください。',
    timestamp: new Date(),
    context: {
      url: '/api/v1/data',
      method: 'GET',
      statusCode: 500,
    },
  }
  handleError(networkError)

  // 3. 高重要度エラーのテスト
  console.log('=== 高重要度エラーのテスト ===')
  const criticalError: AppError = {
    id: `critical_error_${Date.now()}`,
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.HIGH,
    message: 'Authentication failed: Invalid token',
    userMessage: 'ログインの有効期限が切れました。再度ログインしてください。',
    timestamp: new Date(),
    context: {
      userId: 'user123',
      action: 'data_access',
    },
  }
  handleError(criticalError)

  // 4. 低重要度エラーのテスト（ユーザー通知なし）
  console.log('=== 低重要度エラーのテスト ===')
  const lowSeverityError: AppError = {
    id: `low_error_${Date.now()}`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    message: 'Validation warning: Field value exceeds recommended range',
    userMessage: 'フィールド値が推奨範囲を超えています',
    timestamp: new Date(),
    context: {
      field: 'fertilizer_amount',
      value: 150,
      recommendedMax: 100,
    },
  }
  handleError(lowSeverityError)

  console.log('=== エラーハンドリングデモ完了 ===')
}

/**
 * 特定のエラーカテゴリをテストする関数
 */
export function testErrorCategory(category: ErrorCategory) {
  const { handleError } = useErrorHandler()

  const testError: AppError = {
    id: `test_${category}_${Date.now()}`,
    category,
    severity: ErrorSeverity.MEDIUM,
    message: `Test error for category: ${category}`,
    userMessage: `${category}カテゴリのテストエラーです`,
    timestamp: new Date(),
    context: { testMode: true },
  }

  handleError(testError)
  console.log(`${category} エラーのテストが完了しました`)
}

/**
 * 特定の重要度をテストする関数
 */
export function testErrorSeverity(severity: ErrorSeverity) {
  const { handleError } = useErrorHandler()

  const testError: AppError = {
    id: `test_${severity}_${Date.now()}`,
    category: ErrorCategory.UNKNOWN,
    severity,
    message: `Test error for severity: ${severity}`,
    userMessage: `${severity}重要度のテストエラーです`,
    timestamp: new Date(),
    context: { testMode: true },
  }

  handleError(testError)
  console.log(`${severity} 重要度のテストが完了しました`)
}