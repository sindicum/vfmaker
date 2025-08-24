import type { AppError } from '@/errors/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// エラーストアの最大保持数
const MAX_ERRORS = 100
// エラーの保持期間（24時間）
const ERROR_RETENTION_TIME = 24 * 60 * 60 * 1000

export const useErrorStore = defineStore('error', () => {
  const errors = ref<AppError[]>([])

  const addError = (error: AppError) => {
    const now = Date.now()
    // 古いエラーを削除（24時間以上前のエラー）
    errors.value = errors.value.filter((e) => {
      return now - e.timestamp.getTime() < ERROR_RETENTION_TIME
    })

    // エラーオブジェクトをシリアライズ可能な形式にクリーンアップ
    const cleanError: AppError = {
      id: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      context: error.context ? JSON.parse(JSON.stringify(error.context)) : undefined,
      // originalErrorは循環参照を避けるため、基本情報のみ保持
      originalError: error.originalError
        ? ({
            name: error.originalError.name,
            message: error.originalError.message,
            // 開発環境では完全なスタックトレースを保持、本番環境では制限
            stack: import.meta.env.DEV
              ? error.originalError.stack
              : error.originalError.stack?.slice(0, 1000),
          } as any)
        : undefined,
    }

    // 新しいエラーを追加
    errors.value.push(cleanError)

    // 重複エラーの除去（5分以内の同一エラー）
    const duplicateThreshold = 5 * 60 * 1000
    errors.value = errors.value.filter((e, index) => {
      return !errors.value.some(
        (other, otherIndex) =>
          otherIndex > index &&
          other.category === e.category &&
          other.message === e.message &&
          other.timestamp.getTime() - e.timestamp.getTime() < duplicateThreshold,
      )
    })
    // 最大保持数を超えた場合、古いエラーから削除
    if (errors.value.length > MAX_ERRORS) {
      errors.value = errors.value.slice(-MAX_ERRORS)
    }
  }

  // エラーをクリアする関数
  const clearErrors = () => {
    errors.value = []
  }
  // 古いエラーを定期的にクリーンアップする関数
  const cleanupOldErrors = () => {
    const now = Date.now()
    errors.value = errors.value.filter((e) => {
      return now - e.timestamp.getTime() < ERROR_RETENTION_TIME
    })
  }

  return { errors, addError, clearErrors, cleanupOldErrors }
})
