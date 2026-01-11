<script setup lang="ts">
import { ref } from 'vue'

import Dialog from '@/components/common/components/Dialog.vue'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'

import { useStoreHandler } from '@/stores/indexedDbStoreHandler'
import { useNotificationStore } from '@/notifications'

import type { MapLibreMap } from '@/types/map.type'
import type { FeatureCollection } from 'geojson'

const notificationStore = useNotificationStore()

const map = defineModel<MapLibreMap>('map')
const deletePolygonId = defineModel<number | null>('deletePolygonId')
const deletePolygonActive = defineModel<boolean>('deletePolygonActive')
const fieldPolygonFeatureCollection = defineModel<FeatureCollection>(
  'fieldPolygonFeatureCollection',
)

const isOpenDialog = ref<boolean>(false)

const { isDesktop } = useControlScreenWidth()
const { readAllFields, deleteField, deleteAllFields, allFieldsCount } = useStoreHandler()

// 選択したポリゴンの削除
async function deleteRegisteredPolygon() {
  if (deletePolygonId.value === null || deletePolygonId.value === undefined) {
    notificationStore.showAlert('Error', 'ポリゴンを選択してください')
    return
  }
  const mapInstance = map?.value
  if (!mapInstance) return

  await deleteField(deletePolygonId.value)
  notificationStore.showAlert('Info', 'ポリゴンを削除しました')

  fieldPolygonFeatureCollection.value = await readAllFields()

  deletePolygonId.value = null
}

// ポリゴンの全削除
async function deleteAllPolygon() {
  const mapInstance = map?.value
  if (!mapInstance) return

  // 非同期でフィールド数を取得して変数に格納
  const fieldsCount = await allFieldsCount()

  if (fieldsCount === 0) {
    notificationStore.showAlert('Error', 'ポリゴンがありません')
    return
  }

  isOpenDialog.value = true
}

// 編集モード終了
function deleteExitEdit() {
  deletePolygonActive.value = false
}

const selectedDialog = async (selected: boolean) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (selected) {
    // ポリゴンを全削除
    await deleteAllFields()
    fieldPolygonFeatureCollection.value = await readAllFields()

    notificationStore.showAlert('Info', 'ポリゴンをすべて削除しました')
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
