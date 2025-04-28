<script setup lang="ts">
import { useStore, usePersistStore } from '@/stores/store'
import { addPMTilesSourceLayer, removePMTitlesSourceLayer } from './handler/LayerHandler'
import type { Draw, MaplibreMap, GeoJSONSource } from '@/types/maplibre'
import type { Feature, Polygon } from 'geojson'

const store = useStore()
const persistStore = usePersistStore()

const draw = defineModel<Draw>('draw')
const map = defineModel<MaplibreMap>('map')
const registerFudepolyActive = defineModel<boolean>('registerFudepolyActive')

const MESSAGE = {
  NOT_SELECTED: '筆ポリゴンを選択して下さい',
  SOURCE_NOT_FOUND: 'ソースが見つかりません',
  MAP_NOT_READY: '地図インスタンスが初期化されていません',
  DRAW_NOT_READY: 'Drawインスタンスが初期化されていません',
}

// 登録実行
function registerFudepoly() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const feature = getDrawFeature()
  if (!feature) return

  persistStore.addFeature(feature)
  draw.value?.clear()
  addPMTilesSourceLayer(mapInstance)

  const source = mapInstance.getSource('registeredFields') as GeoJSONSource
  if (source) {
    source.setData(persistStore.featurecollection)
  } else {
    console.error(MESSAGE.SOURCE_NOT_FOUND)
  }
}

// 選択クリア
function clearFudepolyLayer() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const feature = getDrawFeature()
  if (!feature) return

  draw.value?.clear()
  addPMTilesSourceLayer(mapInstance)
}

// 編集モード終了
function exitFudepolyEdit() {
  const mapInstance = map?.value
  if (!mapInstance) return
  registerFudepolyActive.value = false
  draw.value?.clear()
  removePMTitlesSourceLayer(mapInstance)
}

// Draw描画オブジェクトを取得
function getDrawFeature(): Feature<Polygon> | null {
  const snapshot = draw.value?.getSnapshot()
  if (!snapshot || snapshot.length === 0) {
    store.setMessage('Error', MESSAGE.NOT_SELECTED)
    return null
  }
  return snapshot[0] as Feature<Polygon>
}
</script>

<template>
  <div class="flex flex-row md:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="registerFudepoly"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!registerFudepolyActive"
    >
      登録実行
    </button>
    <button
      type="button"
      @click="clearFudepolyLayer"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!registerFudepolyActive"
    >
      選択クリア
    </button>
    <button
      type="button"
      @click="exitFudepolyEdit"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!registerFudepolyActive"
    >
      編集モード終了
    </button>
  </div>
</template>
