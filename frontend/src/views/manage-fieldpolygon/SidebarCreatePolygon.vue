<script setup lang="ts">
import Dialog from '@/components/DialogComp.vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'

import type { Draw, MaplibreMap, GeoJSONSource } from '@/types/maplibre'
import type { Feature, Polygon } from 'geojson'

const store = useStore()
const persistStore = usePersistStore()

const createPolygonActive = defineModel<boolean>('createPolygonActive')
const map = defineModel<MaplibreMap>('map')
const draw = defineModel<Draw>('draw')
const isOpenDialog = defineModel<boolean>('isOpenDialog')

const exitCreatePolygon = () => {
  createPolygonActive.value = false
}

// 「ポリゴンの新規作成」ダイアログのYes/No処理
const selectedDialog = (selected: boolean) => {
  const mapInstance = map?.value
  if (!mapInstance) return
  const drawInstance = draw?.value
  if (!drawInstance) return

  if (selected) {
    const snapshot = draw.value?.getSnapshot()
    if (!snapshot || snapshot.length === 0) return
    const feature = snapshot[0] as Feature<Polygon>

    isOpenDialog.value = false
    persistStore.addFeature(feature)
    drawInstance.clear()

    const source = mapInstance.getSource('registeredFields') as GeoJSONSource
    if (source) {
      source.setData(persistStore.featurecollection)
    } else {
      store.setMessage('Error', 'ソースが見つかりません')
    }
  }

  if (!selected) {
    drawInstance.clear()
    drawInstance.setMode('polygon')
    isOpenDialog.value = false
  }
}
</script>

<template>
  <div class="flex flex-row lg:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="exitCreatePolygon()"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!createPolygonActive"
    >
      編集モード終了
    </button>
  </div>

  <Dialog message="ポリゴンを登録しますか" :isOpen="isOpenDialog!" @selected="selectedDialog" />
</template>
