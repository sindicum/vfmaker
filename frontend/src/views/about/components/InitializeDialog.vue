<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/solid'

interface Props {
  message: string
  isOpen: boolean
}
interface Emits {
  (e: 'selected', selected: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const onSelected = (selected: boolean) => {
  emit('selected', selected)
}
</script>

<template>
  <div v-show="props.isOpen" class="fixed top-0 left-0 w-screen h-screen bg-black/30 z-50">
    <div class="flex items-center justify-center h-full">
      <div class="bg-slate-100 w-96 rounded-md">
        <div class="flex flex-col items-center pt-8 pb-4 px-6">
          <!-- 警告アイコン -->
          <ExclamationTriangleIcon class="w-16 h-16 text-red-600 mb-4" />
          <!-- メッセージ -->
          <div class="text-center text-gray-700">{{ message }}</div>
        </div>
        <div class="flex justify-between px-12 py-6">
          <button
            class="h-12 w-32 bg-red-600 hover:bg-red-700 rounded-md font-medium text-white"
            @click="onSelected(true)"
          >
            はい
          </button>
          <button
            class="h-12 w-32 bg-white hover:bg-slate-50 border border-slate-800 rounded-md font-medium"
            @click="onSelected(false)"
          >
            いいえ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
