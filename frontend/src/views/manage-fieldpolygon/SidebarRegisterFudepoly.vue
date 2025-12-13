<script setup lang="ts">
import { ref } from 'vue'
import InputMemoDialog from './components/InputMemoDialog.vue'
import { usePolygonFeature } from './composables/usePolygonFeature'
import {
  addPMTilesSource,
  addPMTilesLayer,
  removePMTitlesSource,
  removePMTitlesLayer,
} from './handler/LayerHandler'

import { useStore } from '@/stores/store'
import { useStoreHandler } from '@/stores/indexedDbStoreHandler'

import type { MapLibreMap, Draw } from '@/types/map.type'
import type { DrawFeature } from '@/types/fieldpolygon.type'
import type { FeatureCollection } from 'geojson'

const store = useStore()
const map = defineModel<MapLibreMap>('map')
const draw = defineModel<Draw>('draw')
const registerFudepolyActive = defineModel<boolean>('registerFudepolyActive')
const isOpenDialog = defineModel<boolean>('isOpenDialog')
const fieldPolygonFeatureCollection = defineModel<FeatureCollection>(
  'fieldPolygonFeatureCollection',
)

const { createField, readAllFields } = useStoreHandler()
const { getPolygonFromSnapshot, createFieldFromPolygon } = usePolygonFeature()

const memo = ref('')

const MESSAGE = {
  NOT_SELECTED: '筆ポリゴンを選択して下さい',
  SOURCE_NOT_FOUND: 'ソースが見つかりません',
  MAP_NOT_READY: '地図インスタンスが初期化されていません',
  DRAW_NOT_READY: 'Drawインスタンスが初期化されていません',
  NOPOLYGON_CREATED: 'ポリゴンが作成されていません',
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
function getDrawFeature(): DrawFeature | null {
  const snapshot = draw.value?.getSnapshot()

  if (!snapshot) {
    store.setMessage('Error', MESSAGE.NOT_SELECTED)
    return null
  }

  if (snapshot.length === 0) {
    store.setMessage('Error', MESSAGE.NOT_SELECTED)
    return null
  }

  const type = snapshot[0].geometry.type
  if (type !== 'Polygon') {
    store.setMessage('Error', MESSAGE.NOPOLYGON_CREATED)
    return null
  }

  return snapshot[0] as DrawFeature
}

// InputMemoDialogのYes/No処理
const handleSelected = async (isSelect: boolean) => {
  if (!isSelect) {
    isOpenDialog.value = false
    memo.value = ''
    return
  }

  const mapInstance = map?.value
  if (!mapInstance) return

  const snapshot = draw.value?.getSnapshot()
  const feature = getPolygonFromSnapshot(snapshot)
  if (!feature) return

  try {
    const field = createFieldFromPolygon(feature, memo.value)
    await createField(field)
  } catch (error) {
    if (error instanceof Error) {
      store.setMessage('Error', error.message)
    } else {
      store.setMessage('Error', '不明なエラーが発生しました')
    }
  }

  draw.value?.clear()
  addPMTilesSource(mapInstance)
  addPMTilesLayer(mapInstance)

  fieldPolygonFeatureCollection.value = await readAllFields()

  isOpenDialog.value = false
  memo.value = ''
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
