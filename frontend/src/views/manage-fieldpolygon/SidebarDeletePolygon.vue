<script setup lang="ts">
import { ref } from 'vue'
import Dialog from '@/components/common/components/Dialog.vue'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'

import type { MaplibreMap, GeoJSONSource } from '@/types/common'

const store = useStore()
const persistStore = usePersistStore()

const map = defineModel<MaplibreMap>('map')
const deletePolygonId = defineModel<string>('deletePolygonId')
const deletePolygonActive = defineModel<boolean>('deletePolygonActive')
const isOpenDialog = ref<boolean>(false)

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
      store.setMessage('Error', 'ソースが見つかりません')
    }
    store.setMessage('Info', 'ポリゴンを削除しました')
    persistStore.removeVariableFertilizationMap(deletePolygonId.value!)
  } else {
    store.setMessage('Error', 'ポリゴンを選択してください')
  }
  deletePolygonId.value = ''
}

// ポリゴンの全削除
function deleteAllPolygon() {
  const mapInstance = map?.value
  if (!mapInstance) return

  const featuresLength = persistStore.featurecollection.features.length

  if (featuresLength === 0) {
    store.setMessage('Error', 'ポリゴンがありません')
    return
  }

  isOpenDialog.value = true
}

// 編集モード終了
function deleteExitEdit() {
  deletePolygonActive.value = false
}

const selectedDialog = (selected: boolean) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (selected) {
    // ポリゴンを全削除
    persistStore.clearFeatureCollection()
    const source = mapInstance.getSource('registeredFields') as GeoJSONSource
    if (source) {
      source.setData(persistStore.featurecollection)
    }
    store.alertMessage.alertType = 'Info'
    store.alertMessage.message = `ポリゴンをすべて削除しました`

    // 作成した可変施肥マップを削除
    persistStore.deleteVariableFertilizationMaps()
  }

  isOpenDialog.value = false
}
</script>

<template>
  <div class="flex flex-row lg:flex-col gap-4 text-sm sm:text-base">
    <button
      type="button"
      @click="deleteRegisteredPolygon"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      選択した<br v-if="!isDesktop" />ポリゴンの削除
    </button>
    <button
      type="button"
      @click="deleteAllPolygon"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      ポリゴンの<br v-if="!isDesktop" />全削除
    </button>
    <button
      type="button"
      @click="deleteExitEdit"
      class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
      v-bind:disabled="!deletePolygonActive"
    >
      編集モード終了
    </button>
  </div>

  <!-- 全削除を選択したときにダイアログを表示 -->
  <Dialog message="本当に削除しますか" :isOpen="isOpenDialog!" @selected="selectedDialog" />
</template>
