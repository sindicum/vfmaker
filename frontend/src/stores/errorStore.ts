import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { safeSerializeContext } from '@/utils/safeJson'

import type { AppError, ErrorSeverity } from '@/errors/types'

// エラーストアの最大保持数
const MAX_ERRORS = 100
// エラーの保持期間（24時間）
const ERROR_RETENTION_TIME = 24 * 60 * 60 * 1000
// 重複検出の閾値（5分）
const DUPLICATE_THRESHOLD = 5 * 60 * 1000
// 自動クリーンアップの間隔（1時間）
const CLEANUP_INTERVAL = 60 * 60 * 1000

export const useErrorStore = defineStore('error', () => {
  const errors = ref<AppError[]>([])
  let cleanupTimer: NodeJS.Timeout | null = null

  const addError = (error: AppError) => {
    if (!error || !error.id || !error.timestamp) {
      console.warn('Invalid error object provided to errorStore')
      return
    }

    const now = Date.now()
    cleanupOldErrors()

    // 重複チェック（同じカテゴリ・メッセージが5分以内）
    const isDuplicate = errors.value.some(
      (existing) =>
        existing.category === error.category &&
        existing.message === error.message &&
        now - existing.timestamp.getTime() < DUPLICATE_THRESHOLD,
    )

    if (isDuplicate) {
      return
    }

    // エラーオブジェクトをシリアライズ可能な形式にクリーンアップ
    const cleanError: AppError = {
      id: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      context: error.context ? safeSerializeContext(error.context) : undefined,
      // originalErrorは循環参照を避けるため、基本情報のみ保持
      originalError: error.originalError
        ? {
            name: error.originalError.name,
            message: error.originalError.message,
            // 開発環境では完全なスタックトレースを保持、本番環境では制限
            stack: import.meta.env.DEV
              ? error.originalError.stack
              : error.originalError.stack?.slice(0, 1000),
          }
        : undefined,
    }

    // エラーを追加（新しいものを先頭に）
    errors.value.unshift(cleanError)

    // 最大保持数を超えた場合、古いエラーから削除
    if (errors.value.length > MAX_ERRORS) {
      errors.value = errors.value.slice(0, MAX_ERRORS)
    }
  }

  // エラーをクリアする関数
  const clearErrors = () => {
    errors.value = []
  }

  // 重要度別エラー削除
  const clearErrorsBySeverity = (severity: ErrorSeverity) => {
    errors.value = errors.value.filter((e) => e.severity !== severity)
  }

  // 特定のエラーを削除
  const removeError = (errorId: string) => {
    const index = errors.value.findIndex((e) => e.id === errorId)
    if (index !== -1) {
      errors.value.splice(index, 1)
    }
  }

  // 古いエラーを定期的にクリーンアップする関数
  const cleanupOldErrors = () => {
    const now = Date.now()
    const originalLength = errors.value.length
    errors.value = errors.value.filter((e) => {
      return now - e.timestamp.getTime() < ERROR_RETENTION_TIME
    })

    // クリーンアップでエラーが削除された場合のログ出力（開発環境のみ）
    if (import.meta.env.DEV && errors.value.length < originalLength) {
      console.log(`Cleaned up ${originalLength - errors.value.length} old errors`)
    }
  }

  // 自動クリーンアップを開始
  const startAutoCleanup = () => {
    if (cleanupTimer) return

    cleanupTimer = setInterval(() => {
      cleanupOldErrors()
    }, CLEANUP_INTERVAL)
  }

  // 自動クリーンアップを停止
  const stopAutoCleanup = () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
  }

  // Computed properties for error statistics
  const errorCount = computed(() => errors.value.length)
  const criticalErrors = computed(() => errors.value.filter((e) => e.severity === 'critical'))
  const highErrors = computed(() => errors.value.filter((e) => e.severity === 'high'))
  const recentErrors = computed(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    return errors.value.filter((e) => e.timestamp.getTime() > oneHourAgo)
  })

  // エラー統計情報
  const getErrorStats = () => {
    const stats = {
      total: errors.value.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      recent: 0,
    }

    const oneHourAgo = Date.now() - 60 * 60 * 1000

    errors.value.forEach((error) => {
      stats[error.severity]++
      if (error.timestamp.getTime() > oneHourAgo) {
        stats.recent++
      }
    })

    return stats
  }

  // 自動クリーンアップを開始（store初期化時）
  startAutoCleanup()

  return {
    // State
    errors: readonly(errors),

    // Computed
    errorCount,
    criticalErrors,
    highErrors,
    recentErrors,

    // Actions
    addError,
    clearErrors,
    clearErrorsBySeverity,
    removeError,
    cleanupOldErrors,
    startAutoCleanup,
    stopAutoCleanup,
    getErrorStats,
  }
})
