<script setup lang="ts">
import Dialog from '@/components/DialogComp.vue'
import { usePersistStore } from '@/stores/store'

import type { Draw, MaplibreMap, GeoJSONSource } from '@/types/maplibre'
import type { Feature, Polygon } from 'geojson'

const persistStore = usePersistStore()

const createPolygonActive = defineModel<boolean>('createPolygonActive')
const map = defineModel<MaplibreMap>('map')
const draw = defineModel<Draw>('draw')
const isOpenDialog = defineModel<boolean>('isOpenDialog')

function exitCreatePolygon() {
  createPolygonActive.value = false
  if (!draw.value) return
  draw.value.setMode('static')
}

// 「ポリゴンの新規作成」ダイアログのYes/No処理
const selectedDialog = (selected: boolean) => {
  if (selected) {
    const mapInstance = map?.value
    if (!mapInstance) return

    const snapshot = draw.value?.getSnapshot()
    if (!snapshot || snapshot.length === 0) return
    const feature = snapshot[0] as Feature<Polygon>

    isOpenDialog.value = false
    persistStore.addFeature(feature)
    draw.value?.clear()

    const source = mapInstance.getSource('registeredFields') as GeoJSONSource
    if (source) {
      source.setData(persistStore.featurecollection)
    } else {
      console.error('ソースが見つかりません')
    }
  }

  if (!selected) {
    draw.value?.clear()
    draw.value?.setMode('polygon')
    isOpenDialog.value = false
  }
}

const onClickTopBtn = () => {
  createPolygonActive.value = true
  draw.value?.setMode('polygon')
}
</script>

<template>
  <button
    type="button"
    @click="onClickTopBtn"
    :class="[
      createPolygonActive
        ? 'bg-slate-200 text-slate-500 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm text-center'
        : 'bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm',
    ]"
    v-bind:disabled="createPolygonActive"
  >
    ポリゴンの新規作成
  </button>
  <div v-show="createPolygonActive" class="flex flex-col gap-4">
    <div class="w-full border-t border-slate-800"></div>
    <button
      type="button"
      @click="exitCreatePolygon()"
      class="bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!createPolygonActive"
    >
      編集モード終了
    </button>
  </div>

  <Dialog message="ポリゴンを登録しますか" :isOpen="isOpenDialog!" @selected="selectedDialog" />
</template>
