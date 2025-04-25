<script setup lang="ts">
import type { MaplibreMap, GeoJSONSource } from '@/types/maplibre'
import { useStore, usePersistStore } from '@/stores/store'
import { addEditLayer, removeLayer } from './handler/LayerHandler'

const persistStore = usePersistStore()
const store = useStore()

const map = defineModel<MaplibreMap>('map')
const deletePolygonId = defineModel<string>('deletePolygonId')
const deletePolygonActive = defineModel<boolean>('deletePolygonActive')

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

const onClickTopBtn = () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  deletePolygonActive.value = true
  removeLayer(mapInstance)
  addEditLayer(mapInstance)
}
</script>

<template>
  <button
    type="button"
    @click="onClickTopBtn"
    :class="[
      deletePolygonActive
        ? 'bg-slate-200 text-slate-500 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm text-center'
        : 'bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm',
    ]"
    v-bind:disabled="deletePolygonActive"
  >
    ポリゴンの削除
  </button>
  <div v-show="deletePolygonActive" class="flex flex-col gap-4">
    <div class="w-full border-t border-slate-800"></div>
    <button
      type="button"
      @click="deleteRegisteredPolygon"
      class="bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      選択したポリゴンの削除
    </button>
    <button
      type="button"
      @click="deleteAllPolygon"
      class="bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      ポリゴンの全削除
    </button>
    <button
      type="button"
      @click="deleteExitEdit"
      class="bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      編集モード終了
    </button>
  </div>
</template>
