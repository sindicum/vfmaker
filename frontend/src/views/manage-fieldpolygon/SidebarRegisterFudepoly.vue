<script setup lang="ts">
import InputMemoDialog from './components/InputMemoDialog.vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { ref } from 'vue'

import {
  addPMTilesSource,
  addPMTilesLayer,
  removePMTitlesSource,
  removePMTitlesLayer,
} from './handler/LayerHandler'

import type { Draw, MaplibreMap, GeoJSONSource } from '@/types/common'
import type { Feature, Polygon } from 'geojson'

const store = useStore()
const persistStore = usePersistStore()

const map = defineModel<MaplibreMap>('map')
const draw = defineModel<Draw>('draw')
const registerFudepolyActive = defineModel<boolean>('registerFudepolyActive')
const isOpenDialog = defineModel<boolean>('isOpenDialog')
const memo = ref('')

const MESSAGE = {
  NOT_SELECTED: '筆ポリゴンを選択して下さい',
  SOURCE_NOT_FOUND: 'ソースが見つかりません',
  MAP_NOT_READY: '地図インスタンスが初期化されていません',
  DRAW_NOT_READY: 'Drawインスタンスが初期化されていません',
}

// 登録実行
function registerFudepoly() {
  const feature = getDrawFeature()
  if (!feature) return

  isOpenDialog.value = true
}

// 選択クリア
function clearFudepolyLayer() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const feature = getDrawFeature()
  if (!feature) return

  draw.value?.clear()
  addPMTilesSource(mapInstance)
  addPMTilesLayer(mapInstance)
}

// 編集モード終了
function exitFudepolyEdit() {
  const mapInstance = map?.value
  if (!mapInstance) return
  registerFudepolyActive.value = false
  draw.value?.clear()
  removePMTitlesLayer(mapInstance)
  removePMTitlesSource(mapInstance)
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

// InputMemoDialogのYes/No処理
const handleSelected = (isSelect: boolean) => {
  const mapInstance = map?.value
  if (!mapInstance) return
  const feature = getDrawFeature()
  if (!feature) return

  if (isSelect) {
    persistStore.addFeature(feature, memo.value)
    draw.value?.clear()
    addPMTilesSource(mapInstance)
    addPMTilesLayer(mapInstance)

    const source = mapInstance.getSource('registeredFields') as GeoJSONSource
    if (source) {
      source.setData(persistStore.featurecollection)
    } else {
      store.setMessage('Error', MESSAGE.SOURCE_NOT_FOUND)
    }
  }
  isOpenDialog.value = false
}
</script>

<template>
  <div class="flex flex-row lg:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="registerFudepoly"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!registerFudepolyActive"
    >
      選択したポリゴンを登録
    </button>
    <button
      type="button"
      @click="clearFudepolyLayer"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!registerFudepolyActive"
    >
      選択クリア
    </button>
    <button
      type="button"
      @click="exitFudepolyEdit"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!registerFudepolyActive"
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
