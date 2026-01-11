<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNotificationStore } from '../stores/notificationStore'

const notificationStore = useNotificationStore()
const isOpen = ref(false)
const alertStyle = ref('')
const alertText = ref('')
const timeOut = ref(3000)
let timeoutId: ReturnType<typeof setTimeout> | null = null

const closeAlert = () => {
  isOpen.value = false
  notificationStore.clearAlert()
  if (timeoutId) clearTimeout(timeoutId)
}

watch(
  () => notificationStore.alert.message,
  (newMessage: string) => {
    const alertType = notificationStore.alert.type

    if (newMessage == '') {
      return
    }
    isOpen.value = true

    if (alertType == 'Error') {
      alertStyle.value = 'bg-red-100/80 border-red-600'
      alertText.value = 'text-red-600'
      timeOut.value = 7000
    }
    if (alertType == 'Warn') {
      alertStyle.value = 'bg-yellow-100/80 border-yellow-600'
      alertText.value = 'text-yellow-600'
      timeOut.value = 5000
    }
    if (alertType == 'Info') {
      alertStyle.value = 'bg-green-100/80 border-green-600'
      alertText.value = 'text-green-600'
      timeOut.value = 3000
    }

    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      isOpen.value = false
      notificationStore.clearAlert()
    }, timeOut.value)
  },
)
</script>

<template>
  <div v-show="isOpen" class="relative flex justify-center z-30">
    <div :class="[alertStyle, 'fixed top-2 lg:top-20 w-11/12 h-16 lg:w-1/2 rounded-md border']">
      <button type="button" class="absolute right-0 w-6 h-6" @click="closeAlert()">×</button>
      <div class="flex items-center justify-center h-16">
        <div :class="[alertText]">
          {{ notificationStore.alert.message }}
        </div>
      </div>
    </div>
  </div>
</template>
