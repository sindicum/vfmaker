<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useErrorHandler, ErrorCategory, ErrorSeverity } from '@/errors'
import type { AppError } from '@/errors'

const hasError = ref(false)
const errorDetails = ref<AppError | null>(null)
const showDetails = ref(false)
const isDev = import.meta.env.DEV
const { handleError } = useErrorHandler()

const generateErrorId = (): string => {
  return `error_boundary_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

const retry = () => {
  hasError.value = false
  errorDetails.value = null
  showDetails.value = false
  window.location.reload()
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
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

  errorDetails.value = appError
  handleError(appError)
  return false // エラーの伝播を停止
})
</script>

<template>
  <div>
    <slot v-if="!hasError" />
    <div v-else class="w-screen h-screen flex items-center justify-center">
      <div class="text-center pb-18 max-w-2xl mx-auto px-4">
        <div class="mb-4">
          <svg
            class="w-16 h-16 text-rose-600 mx-auto"
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

        <div class="flex gap-2 justify-center mb-4">
          <button
            @click="retry"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            再試行
          </button>

          <!-- 開発環境でのみ詳細表示ボタンを表示 -->
          <button
            v-if="isDev && errorDetails"
            @click="toggleDetails"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {{ showDetails ? '詳細を隠す' : '詳細を表示' }}
          </button>
        </div>

        <!-- 開発環境での詳細エラー情報 -->
        <div
          v-if="isDev && showDetails && errorDetails"
          class="mt-6 text-left bg-gray-100 p-4 rounded-lg overflow-auto max-h-96"
        >
          <div class="mb-4">
            <h4 class="font-semibold text-gray-700 mb-1">エラーメッセージ:</h4>
            <p class="text-sm text-gray-600 font-mono">{{ errorDetails.message }}</p>
          </div>

          <div class="mb-4" v-if="errorDetails.context?.componentName">
            <h4 class="font-semibold text-gray-700 mb-1">発生コンポーネント:</h4>
            <p class="text-sm text-gray-600 font-mono">{{ errorDetails.context.componentName }}</p>
          </div>

          <div class="mb-4" v-if="errorDetails.context?.componentInfo">
            <h4 class="font-semibold text-gray-700 mb-1">エラー種別:</h4>
            <p class="text-sm text-gray-600 font-mono">{{ errorDetails.context.componentInfo }}</p>
          </div>

          <div v-if="errorDetails.originalError?.stack">
            <h4 class="font-semibold text-gray-700 mb-1">スタックトレース:</h4>
            <pre class="text-xs text-gray-600 whitespace-pre-wrap break-all">{{
              errorDetails.originalError.stack
            }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
