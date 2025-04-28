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
</script>

<template>
  <div class="flex flex-row md:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="exitCreatePolygon()"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!createPolygonActive"
    >
      編集モード終了
    </button>
  </div>

  <Dialog message="ポリゴンを登録しますか" :isOpen="isOpenDialog!" @selected="selectedDialog" />
</template>
