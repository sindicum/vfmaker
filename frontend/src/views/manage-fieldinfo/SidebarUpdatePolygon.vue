<script setup lang="ts">
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { addEditLayer, FILL_LAYER_NAME } from './handler/LayerHandler'

import type { Draw, MaplibreMap, GeoJSONSource } from '@/types/maplibre'
import type { Feature, Polygon } from 'geojson'

const persistStore = usePersistStore()
const store = useStore()

const map = defineModel<MaplibreMap>('map')
const draw = defineModel<Draw>('draw')
const updatePolygonId = defineModel<string>('updatePolygonId')
const updatePolygonActive = defineModel<boolean>('updatePolygonActive')

// 更新実行
function updateRegisteredPolygon() {
  const mapInstance = map?.value
  if (!mapInstance) return

  const hasLayer = mapInstance.getLayer(FILL_LAYER_NAME)

  if (updatePolygonId.value !== '' && !hasLayer) {
    const mapInstance = map?.value
    if (!mapInstance) return

    const filteredFeatureIndex: number = persistStore.featurecollection.features.findIndex(
      (el) => el.properties.id === updatePolygonId.value,
    )
    const snapshot = draw.value?.getSnapshot()
    if (!snapshot || snapshot.length === 0) return
    const feature = snapshot[0] as Feature<Polygon>
    persistStore.featurecollection.features[filteredFeatureIndex].geometry = feature.geometry

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
</script>

<template>
  <div class="flex flex-row md:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="updateRegisteredPolygon"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!updatePolygonActive"
    >
      更新実行
    </button>
    <button
      type="button"
      @click="updateClearEditLayer"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!updatePolygonActive"
    >
      選択クリア
    </button>
    <button
      type="button"
      @click="updateExitEdit"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!updatePolygonActive"
    >
      編集モード終了
    </button>
  </div>
</template>
