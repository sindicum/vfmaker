<script setup lang="ts">
import InputMemoDialog from './components/InputMemoDialog.vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { addEditLayer, FILL_LAYER_NAME } from './handler/LayerHandler'
import { ref, computed } from 'vue'

import type { Draw, MaplibreMap, GeoJSONSource } from '@/types/common'
import type { Feature, Polygon } from 'geojson'

const persistStore = usePersistStore()
const store = useStore()

const map = defineModel<MaplibreMap>('map')
const draw = defineModel<Draw>('draw')
const updatePolygonId = defineModel<string>('updatePolygonId')
const updatePolygonActive = defineModel<boolean>('updatePolygonActive')
const isOpenDialog = defineModel<boolean>('isOpenDialog')

const filteringResult = computed(() => {
  const filteredFeatureIndex: number = persistStore.featurecollection.features.findIndex(
    (el) => el.properties.id === updatePolygonId.value,
  )
  const defaultMemo =
    persistStore.featurecollection.features[filteredFeatureIndex].properties.memo || ''
  return { filteredFeatureIndex, defaultMemo }
})

const updateFeatureMemo = ref<string>('')

// 更新実行
function updateRegisteredPolygon() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const hasLayer = mapInstance.getLayer(FILL_LAYER_NAME)

  if (updatePolygonId.value !== '' && !hasLayer) {
    updateFeatureMemo.value = filteringResult.value.defaultMemo

    // ダイアログを開き、handleSelectedを発火
    isOpenDialog.value = true
  }

  if (updatePolygonId.value !== '' && hasLayer) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
    updatePolygonId.value = ''
  }

  if (updatePolygonId.value === '' && hasLayer) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
  }
}
// 選択クリア
function updateClearEditLayer() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const drawInstance = draw?.value
  if (!drawInstance) return

  const hasLayer = mapInstance.getLayer(FILL_LAYER_NAME)

  if (updatePolygonId.value !== '' && !hasLayer) {
    drawInstance.clear()
    addEditLayer(mapInstance)
    updatePolygonId.value = ''
  }

  if (updatePolygonId.value !== '' && hasLayer) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
    updatePolygonId.value = ''
  }

  if (updatePolygonId.value === '' && hasLayer) {
    store.setMessage('Error', '筆ポリゴンを選択して下さい')
  }
}
// 編集モード終了
function updateExitEdit() {
  updatePolygonActive.value = false
}

// InputMemoDialogのYes/No処理
const handleSelected = (isSelect: boolean) => {
  if (updatePolygonId.value !== '' && isSelect) {
    const mapInstance = map?.value
    if (!mapInstance) return

    const snapshot = draw.value?.getSnapshot()
    if (!snapshot || snapshot.length === 0) return
    const feature = snapshot[0] as Feature<Polygon>
    persistStore.featurecollection.features[filteringResult.value.filteredFeatureIndex].geometry =
      feature.geometry
    persistStore.featurecollection.features[
      filteringResult.value.filteredFeatureIndex
    ].properties.memo = updateFeatureMemo.value

    draw.value?.clear()

    const source = mapInstance.getSource('registeredFields') as GeoJSONSource
    if (source) {
      source.setData(persistStore.featurecollection)
    } else {
      console.error('ソースが見つかりません')
    }
    addEditLayer(mapInstance)
    store.setMessage('Info', 'ポリゴンを更新しました')
    updatePolygonId.value = ''
    // }
  }
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
      更新実行
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
    message="ポリゴンを登録しますか"
    :isOpen="isOpenDialog!"
    v-model:memo="updateFeatureMemo"
    @selected="handleSelected"
  />
</template>
