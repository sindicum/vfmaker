import type { AppError } from '@/types/error'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useErrorStore = defineStore('error', () => {
  const errors = ref<AppError[]>([])

  const addError = (error: AppError) => {
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
  }

  return { errors, addError }
})
