<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '@/stores/store'
import HelpDialog from './RealtimeFertilizationHelpDialog.vue'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'
const store = useStore()
const isHelpDialogOpen = ref(false)
const props = defineProps<{
  currentFertilizerAmount: number | null
  currentGridInfo: {
    fertilizerAmount: number
    vfmId: string
  } | null
}>()
const { isDesktop } = useControlScreenWidth()
const emit = defineEmits<{
  (e: 'stopRealtimeVfm'): void
}>()

const stopRealtimeVfm = () => {
  emit('stopRealtimeVfm')
}
</script>

<template>
  <!-- 現在位置のグリッド情報 -->
  <div
    v-if="props.currentFertilizerAmount"
    class="p-4 bg-amber-50 rounded-lg border border-amber-200"
  >
    <h3 class="font-semibold text-amber-800 mb-3 text-center">現在位置の施肥量</h3>
    <div class="text-center">
      <div class="text-2xl font-bold text-amber-700 mb-1">{{ currentFertilizerAmount }}kg/10a</div>
    </div>
  </div>

  <!-- 位置情報が無効な場合の表示 -->
  <div v-else-if="store.currentGeolocation.lat === null && store.currentGeolocation.lng === null">
    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div class="flex items-center justify-center gap-2">
        <div class="text-center text-sm text-gray-600">現在位置が取得できません</div>
        <button
          @click="isHelpDialogOpen = true"
          class="h-5 w-12 rounded-md bg-amber-600 text-white text-xs hover:bg-amber-700 transition-colors duration-200 flex items-center justify-center"
          title="位置情報の取得方法について"
        >
          Help
        </button>
      </div>
    </div>
  </div>

  <!-- 現在位置がVFMエリア内にある場合の表示 -->
  <div
    v-else-if="
      store.currentGeolocation.lat !== null &&
      store.currentGeolocation.lng !== null &&
      currentGridInfo === null
    "
    class="p-4 bg-gray-50 rounded-lg border border-gray-200"
  >
    <div class="text-center text-sm text-gray-600">現在位置は登録されたVFMエリア外です</div>
  </div>

  <div v-if="isDesktop" class="flex justify-center items-center my-4">
    <button
      class="p-2 rounded-md bg-white ring-1 ring-inset ring-gray-300 w-1/2"
      @click="stopRealtimeVfm"
      title="終了"
    >
      終了
    </button>
  </div>
  <div v-else class="absolute top-3 right-3">
    <button
      class="text-gray-400 hover:text-gray-600 transition-colors duration-200"
      @click="stopRealtimeVfm"
      title="終了"
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

  <!-- ヘルプダイアログ -->
  <HelpDialog v-model:isHelpDialogOpen="isHelpDialogOpen" />
</template>
