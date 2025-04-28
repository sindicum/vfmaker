<script setup lang="ts">
import type { MaplibreMap, GeoJSONSource } from '@/types/maplibre'
import { useStore, usePersistStore } from '@/stores/store'

import { useControlScreenWidth } from '@/components/useControlScreenWidth'
const persistStore = usePersistStore()
const store = useStore()

const map = defineModel<MaplibreMap>('map')
const deletePolygonId = defineModel<string>('deletePolygonId')
const deletePolygonActive = defineModel<boolean>('deletePolygonActive')

const { isDesktop } = useControlScreenWidth()

// 選択したポリゴンの削除
function deleteRegisteredPolygon() {
  if (deletePolygonId.value !== '') {
    const mapInstance = map?.value
    if (!mapInstance) return

    const filteredFeatures = persistStore.featurecollection.features.filter((el) => {
      return el.properties.id !== deletePolygonId.value
    })
    persistStore.featurecollection.features = filteredFeatures

    const source = mapInstance.getSource('registeredFields') as GeoJSONSource
    if (source) {
      source.setData(persistStore.featurecollection)
    } else {
      console.error('ソースが見つかりません')
    }
    store.alertMessage.alertType = 'Info'
    store.alertMessage.message = `ポリゴンを削除しました`
  } else {
    store.alertMessage.alertType = 'Error'
    store.alertMessage.message = `ポリゴンを選択してください`
  }
  deletePolygonId.value = ''
}

// ポリゴンの全削除
function deleteAllPolygon() {
  const mapInstance = map?.value
  if (!mapInstance) return

  persistStore.clearFeatureCollection()
  const source = mapInstance.getSource('registeredFields') as GeoJSONSource
  if (source) {
    source.setData(persistStore.featurecollection)
  }
  store.alertMessage.alertType = 'Info'
  store.alertMessage.message = `ポリゴンをすべて削除しました`
}

// 編集モード終了
function deleteExitEdit() {
  deletePolygonActive.value = false
}
</script>

<template>
  <div class="flex flex-row md:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="deleteRegisteredPolygon"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      選択したポリゴンの<br v-if="!isDesktop" />削除
    </button>
    <button
      type="button"
      @click="deleteAllPolygon"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      ポリゴンの全削除
    </button>
    <button
      type="button"
      @click="deleteExitEdit"
      class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      編集モード終了
    </button>
  </div>
</template>
