<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStore } from '@/stores/store'

const store = useStore()
const isOpen = ref(false)
let timeoutId: ReturnType<typeof setTimeout> | null = null

const closeAlert = () => {
  isOpen.value = false
  store.setMessage('', '')
  if (timeoutId) clearTimeout(timeoutId)
}
watch(
  () => store.alertMessage.message,
  (newMessage: string) => {
    if (newMessage !== '') {
      isOpen.value = true

      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        isOpen.value = false
        store.setMessage('', '')
      }, 3000)
    }
  },
)
</script>

<template>
  <div v-show="isOpen" class="relative flex justify-center">
    <div
      :class="[
        store.alertMessage.alertType === 'Error'
          ? 'bg-red-100/80 border-red-600'
          : 'bg-green-100/80 border-green-600',
        'fixed top-0 md:top-20 w-full h-16 md:w-1/2 z-20  rounded-md border',
      ]"
    >
      <button type="button" class="absolute right-0 w-6 h-6" @click="closeAlert()">×</button>
      <div class="flex items-center justify-center h-16">
        <div
          :class="[store.alertMessage.alertType === 'Error' ? 'text-red-600' : 'text-green-600']"
        >
          {{ store.alertMessage.message }}
        </div>
      </div>
    </div>
  </div>
</template>
