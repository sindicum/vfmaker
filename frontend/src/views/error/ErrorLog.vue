<script setup lang="ts">
import { ref, computed } from 'vue'
import { useErrorStore } from '@/stores/errorStore'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'
import type { AppError } from '@/errors/types'

const errorStore = useErrorStore()

// フィルタの状態
const selectedCategory = ref<ErrorCategory | 'all'>('all')
const selectedSeverity = ref<ErrorSeverity | 'all'>('all')
const expandedErrors = ref<Record<string, boolean>>({})

// フィルタされたエラー
const filteredErrors = computed(() => {
  return errorStore.errors
    .filter((error) => {
      if (selectedCategory.value !== 'all' && error.category !== selectedCategory.value) {
        return false
      }
      if (selectedSeverity.value !== 'all' && error.severity !== selectedSeverity.value) {
        return false
      }
      return true
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // 新しい順
})

// エラー詳細の展開・折りたたみ
const toggleError = (errorId: string) => {
  expandedErrors.value[errorId] = !expandedErrors.value[errorId]
}

// エラーのクリア
const clearAllErrors = () => {
  if (confirm('すべてのエラーログをクリアしてもよろしいですか？')) {
    errorStore.clearErrors()
  }
}

// エラーのエクスポート
const exportErrors = () => {
  const dataStr = JSON.stringify(filteredErrors.value, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const exportFileDefaultName = `error-log-${new Date().toISOString()}.json`
  
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

// カテゴリの色
const getCategoryColor = (category: ErrorCategory) => {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'bg-blue-100 text-blue-800'
    case ErrorCategory.GEOSPATIAL:
      return 'bg-green-100 text-green-800'
    case ErrorCategory.VALIDATION:
      return 'bg-yellow-100 text-yellow-800'
    case ErrorCategory.PERMISSION:
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 重要度の色
const getSeverityColor = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'bg-gray-100 text-gray-800'
    case ErrorSeverity.MEDIUM:
      return 'bg-yellow-100 text-yellow-800'
    case ErrorSeverity.HIGH:
      return 'bg-red-100 text-red-800'
    case ErrorSeverity.CRITICAL:
      return 'bg-red-600 text-white'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// AggregateErrorかどうかチェック
const isAggregateError = (error: any): error is AggregateError => {
  return error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)
}

// エラー情報を安全に取得
const getErrorInfo = (error: any) => {
  try {
    return {
      name: error?.name || 'Unknown',
      message: error?.message || 'No message',
      stack: error?.stack ? String(error.stack).slice(0, 1000) : '' // 最大1000文字
    }
  } catch {
    return { name: 'Error', message: 'Cannot read error', stack: '' }
  }
}

// AggregateErrorを安全に処理
const getSafeAggregateErrors = (error: any) => {
  try {
    if (!isAggregateError(error)) return []
    return error.errors.slice(0, 10).map(getErrorInfo) // 最大10個まで
  } catch {
    return []
  }
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 pt-16">
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">エラーログ</h1>
        
        <!-- フィルタとアクション -->
        <div class="mb-6 space-y-4">
          <div class="flex flex-wrap gap-4">
            <!-- カテゴリフィルタ -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
              <select
                v-model="selectedCategory"
                class="block w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">すべて</option>
                <option :value="ErrorCategory.NETWORK">ネットワーク</option>
                <option :value="ErrorCategory.GEOSPATIAL">地理空間</option>
                <option :value="ErrorCategory.VALIDATION">検証</option>
                <option :value="ErrorCategory.PERMISSION">権限</option>
                <option :value="ErrorCategory.UNKNOWN">不明</option>
              </select>
            </div>
            
            <!-- 重要度フィルタ -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">重要度</label>
              <select
                v-model="selectedSeverity"
                class="block w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">すべて</option>
                <option :value="ErrorSeverity.LOW">低</option>
                <option :value="ErrorSeverity.MEDIUM">中</option>
                <option :value="ErrorSeverity.HIGH">高</option>
                <option :value="ErrorSeverity.CRITICAL">致命的</option>
              </select>
            </div>
            
            <!-- アクションボタン -->
            <div class="flex-1 flex justify-end gap-2">
              <button
                @click="exportErrors"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                エクスポート
              </button>
              <button
                @click="clearAllErrors"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                すべてクリア
              </button>
            </div>
          </div>
          
          <!-- エラー件数 -->
          <div class="text-sm text-gray-600">
            {{ filteredErrors.length }}件のエラー
          </div>
        </div>
        
        <!-- エラー一覧 -->
        <div class="space-y-2">
          <div
            v-for="error in filteredErrors"
            :key="error.id"
            class="border border-gray-200 rounded-lg overflow-hidden"
          >
            <!-- エラーヘッダー -->
            <div
              class="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              @click="toggleError(error.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      :class="[getCategoryColor(error.category), 'px-2 py-1 rounded-full text-xs font-medium']"
                    >
                      {{ error.category }}
                    </span>
                    <span
                      :class="[getSeverityColor(error.severity), 'px-2 py-1 rounded-full text-xs font-medium']"
                    >
                      {{ error.severity }}
                    </span>
                    <span class="text-sm text-gray-500">
                      {{ error.timestamp.toLocaleString('ja-JP') }}
                    </span>
                  </div>
                  <p class="text-gray-800 font-medium">{{ error.message }}</p>
                  <p class="text-sm text-gray-600 mt-1">{{ error.userMessage }}</p>
                </div>
                <svg
                  :class="[expandedErrors[error.id] ? 'rotate-180' : '', 'w-5 h-5 text-gray-400 transition-transform']"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <!-- エラー詳細 -->
            <div v-show="expandedErrors[error.id]" class="p-4 bg-white border-t border-gray-200">
              <!-- Original Error -->
              <div v-if="error.originalError" class="mb-4">
                <h4 class="font-semibold text-gray-700 mb-2">Original Error:</h4>
                <div class="bg-gray-100 p-3 rounded text-sm font-mono">
                  <div class="text-red-600">{{ getErrorInfo(error.originalError).name }}: {{ getErrorInfo(error.originalError).message }}</div>
                  
                  <!-- AggregateError の詳細 -->
                  <div v-if="isAggregateError(error.originalError)" class="mt-3">
                    <div class="font-semibold mb-2">AggregateError contains {{ getSafeAggregateErrors(error.originalError).length }} errors:</div>
                    <div
                      v-for="(subError, index) in getSafeAggregateErrors(error.originalError)"
                      :key="`${error.id}-sub-${index}`"
                      class="ml-4 mb-2 p-2 bg-gray-200 rounded"
                    >
                      <div class="text-red-600">
                        Error {{ index + 1 }}: {{ subError.name }} - {{ subError.message }}
                      </div>
                      <div v-if="subError.stack" class="text-xs text-gray-600 mt-1 whitespace-pre-wrap overflow-hidden">
                        {{ subError.stack }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- スタックトレース -->
                  <div v-if="getErrorInfo(error.originalError).stack && !isAggregateError(error.originalError)" class="mt-2 text-xs text-gray-600 whitespace-pre-wrap overflow-hidden">
                    {{ getErrorInfo(error.originalError).stack }}
                  </div>
                </div>
              </div>
              
              <!-- Context -->
              <div v-if="error.context && Object.keys(error.context).length > 0">
                <h4 class="font-semibold text-gray-700 mb-2">Context:</h4>
                <div class="bg-gray-100 p-3 rounded">
                  <pre class="text-sm whitespace-pre-wrap">{{ JSON.stringify(error.context, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
          
          <!-- エラーがない場合 -->
          <div v-if="filteredErrors.length === 0" class="text-center py-8 text-gray-500">
            エラーログがありません
          </div>
        </div>
      </div>
    </div>
  </main>
</template>