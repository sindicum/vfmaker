<script setup lang="ts">
import { ref } from 'vue'

import InputMemoDialog from './components/InputMemoDialog.vue'
import { usePolygonFeature } from './composables/usePolygonFeature'
import { useStoreHandler } from '@/stores/indexedDbStoreHandler'
import { useNotificationStore } from '@/notifications'

import type { Draw, MapLibreMap } from '@/types/map.type'
import type { FeatureCollection } from 'geojson'

const map = defineModel<MapLibreMap>('map')
const draw = defineModel<Draw>('draw')
const notificationStore = useNotificationStore()
const createPolygonActive = defineModel<boolean>('createPolygonActive')
const isOpenDialog = defineModel<boolean>('isOpenDialog')
const fieldPolygonFeatureCollection = defineModel<FeatureCollection>(
  'fieldPolygonFeatureCollection',
)

const memo = ref('')

const { getPolygonFromSnapshot, createFieldFromPolygon } = usePolygonFeature()
const { createField, readAllFields } = useStoreHandler()

const exitCreatePolygon = () => {
  createPolygonActive.value = false
}

// 「ポリゴンの新規作成」ダイアログのYes/No処理
const handleSelected = async (isSelect: boolean) => {
  const mapInstance = map?.value
  if (!mapInstance) return
  const drawInstance = draw?.value
  if (!drawInstance) return

  if (!isSelect) {
    drawInstance.clear()
    drawInstance.setMode('polygon')
    isOpenDialog.value = false
    return
  }

  const snapshot = draw.value?.getSnapshot()
  const feature = getPolygonFromSnapshot(snapshot)
  if (!feature) return

  try {
    const field = createFieldFromPolygon(feature, memo.value)
    await createField(field)
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.showAlert('Error', error.message)
    } else {
      notificationStore.showAlert('Error', '不明なエラーが発生しました')
    }
  }

  isOpenDialog.value = false
  drawInstance.clear()

  fieldPolygonFeatureCollection.value = await readAllFields()
}
</script>

<template>
  <div class="flex flex-row lg:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="exitCreatePolygon"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!createPolygonActive"
    >
      編集モード終了
    </button>
  </div>

  <InputMemoDialog
    message="ポリゴンを登録しますか"
    :isOpen="isOpenDialog!"
    v-model:memo="memo"
    @selected="handleSelected"
  />
</template>
