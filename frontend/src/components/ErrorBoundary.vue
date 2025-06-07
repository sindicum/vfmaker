<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useErrorHandler } from '@/composables/useErrorHandler'
import type { AppError } from '@/types/error'
import { ErrorCategory, ErrorSeverity } from '@/types/error'

const hasError = ref(false)
const { handleError } = useErrorHandler()

const generateErrorId = (): string => {
  return `error_boundary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

const retry = () => {
  hasError.value = false
  window.location.reload()
}

onErrorCaptured((error, instance, info) => {
  hasError.value = true

  const appError: AppError = {
    id: generateErrorId(),
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    message: error.message || 'Unknown component error',
    userMessage: 'アプリケーションエラーが発生しました',
    timestamp: new Date(),
    context: {
      componentInfo: info,
      componentName: instance?.$?.type?.name || 'Unknown',
      stack: error.stack,
    },
    originalError: error,
  }

  handleError(appError)
  return false // エラーの伝播を停止
})
</script>

<template>
  <div>
    <slot v-if="!hasError" />
    <div v-else class="error-boundary">
      <div class="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div class="mb-4">
          <svg
            class="w-16 h-16 text-red-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">アプリケーションエラーが発生しました</h3>
        <p class="text-gray-600 mb-4">申し訳ございません。予期しないエラーが発生しました。</p>
        <button
          @click="retry"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  </div>
</template>
