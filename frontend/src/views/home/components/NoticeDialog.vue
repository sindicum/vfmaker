<script setup lang="ts">
import { useConfigPersistStore } from '@/stores/configPersistStore'

const configPersistStore = useConfigPersistStore()
const isDialogOpen = defineModel('isDialogOpen')
</script>

<template>
  <div v-show="isDialogOpen" class="fixed top-0 left-0 w-screen h-screen bg-black/30 z-50">
    <div class="flex items-center justify-center h-full p-4">
      <div class="bg-white max-w-md w-full rounded-lg shadow-lg">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800">VFMakerの利用について</h3>
            <button
              @click="isDialogOpen = false"
              class="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
          <div class="text-sm text-gray-600 space-y-3 py-4">
            <ul class="list-disc list-outside space-y-2 ml-2">
              <li>
                本サービスに登録した圃場情報や可変施肥マップは、Webブラウザのストレージ（indexedDB）に保存されます。サーバーに保存されません。
              </li>
              <li>
                ストレージに保存できる登録圃場数および可変施肥マップ数は現在10件までに制限してます。
              </li>
              <li>
                ブラウザのストレージは、利用状況により失われる可能性があることを了承お願いいたします。
              </li>
              <li>利用にあたり「本サイトについて」を予めご確認・ご了承のうえご利用願います。</li>
            </ul>
          </div>
          <div class="my-6">
            <div class="flex flex-col gap-2 ml-2">
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="!configPersistStore.isNoticeVisible"
                  @change="configPersistStore.noticeVisibleChanged"
                  class="w-4 h-4 accent-indigo-600"
                />
                <span>今後表示しない</span>
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-center">
            <button
              @click="isDialogOpen = false"
              class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
