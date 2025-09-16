<script setup lang="ts">
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
          <div class="text-sm text-gray-600 space-y-3">
            <ul class="list-disc list-outside space-y-2 ml-2">
              <li>
                現在は無償サービスのため、圃場登録数および可変施肥マップの登録上限は5件に制限しております。
              </li>
              <li>ご要望をふまえ、機能改善に努めてまいります</li>
            </ul>
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
