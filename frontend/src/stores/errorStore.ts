import type { AppError } from '@/types/error'
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
    // 新しいエラーを追加
    errors.value.push(error)

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
