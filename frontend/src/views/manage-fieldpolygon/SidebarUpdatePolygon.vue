<script setup lang="ts">
import { ref } from 'vue'
import InputMemoDialog from './components/InputMemoDialog.vue'
import { usePolygonFeature } from './composables/usePolygonFeature'
import { addEditLayer, FILL_LAYER_NAME } from './handler/LayerHandler'

import { useStoreHandler } from '@/stores/indexedDbStoreHandler'
import { useStore } from '@/stores/store'

import type { MapLibreMap, Draw } from '@/types/map.type'
import type { FeatureCollection } from 'geojson'

const store = useStore()
const { readAllFields, readField, updateField } = useStoreHandler()
const { getPolygonFromSnapshot, createUpdateField } = usePolygonFeature()

const map = defineModel<MapLibreMap>('map')
const draw = defineModel<Draw>('draw')
const updatePolygonId = defineModel<number | null>('updatePolygonId')
const updatePolygonActive = defineModel<boolean>('updatePolygonActive')
const isOpenDialog = defineModel<boolean>('isOpenDialog')
const fieldPolygonFeatureCollection = defineModel<FeatureCollection>(
  'fieldPolygonFeatureCollection',
)

const memo = ref<string>('')

// クリックしたポリゴンにメモをセットして更新実行
async function updateRegisteredPolygon() {
  const mapInstance = map?.value
  if (!mapInstance) return

  const hasLayer = mapInstance.getLayer(FILL_LAYER_NAME)
  if (hasLayer) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
    return
  }
  if (!updatePolygonId.value) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
    return
  }

  const f = await readField(updatePolygonId.value)
  if (!f) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
    return
  }
  memo.value = f.properties.memo
  // ダイアログを開き、handleSelectedを発火
  isOpenDialog.value = true
}

// 選択クリア
function updateClearEditLayer() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const drawInstance = draw?.value
  if (!drawInstance) return

  const hasLayer = mapInstance.getLayer(FILL_LAYER_NAME)
  if (hasLayer) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
    return
  }
  if (updatePolygonId.value === null) return

  drawInstance.clear()
  addEditLayer(mapInstance)
  updatePolygonId.value = null
}

// 編集モード終了
function updateExitEdit() {
  updatePolygonActive.value = false
}

// InputMemoDialogのYes/No処理
const handleSelected = async (isSelect: boolean) => {
  if (!isSelect) {
    updateClearEditLayer()
    isOpenDialog.value = false
    return
  }
  if (updatePolygonId.value === null || updatePolygonId.value === undefined) return
  const mapInstance = map?.value
  if (!mapInstance) return

  const snapshot = draw.value?.getSnapshot()
  const feature = getPolygonFromSnapshot(snapshot)
  if (!feature) return

  const field = createUpdateField(feature, memo.value)

  await updateField(updatePolygonId.value, field).catch((error) => {
    console.error('ポリゴンの更新に失敗しました:', error)
    store.setMessage('Error', 'ポリゴンの更新に失敗しました')
  })

  draw.value?.clear()

  fieldPolygonFeatureCollection.value = await readAllFields()

  addEditLayer(mapInstance)
  store.setMessage('Info', 'ポリゴンを更新しました')
  updatePolygonId.value = null
  isOpenDialog.value = false
}
</script>

<template>
  <div class="flex flex-row lg:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="updateRegisteredPolygon"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!updatePolygonActive"
    >
      上書き保存
    </button>
    <button
      type="button"
      @click="updateClearEditLayer"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!updatePolygonActive"
    >
      選択クリア
    </button>
    <button
      type="button"
      @click="updateExitEdit"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!updatePolygonActive"
    >
      編集モード終了
    </button>
  </div>

  <InputMemoDialog
    message="ポリゴンを更新しますか"
    :isOpen="isOpenDialog!"
    v-model:memo="memo"
    @selected="handleSelected"
  />
</template>
