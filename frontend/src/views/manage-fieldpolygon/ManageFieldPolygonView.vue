<script setup lang="ts">
import { inject, onMounted, watch, ref, shallowRef, computed, onBeforeUnmount } from 'vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'

import MapBase from '@/components/map/MapBase.vue'
import SidebarCreatePolygon from './SidebarCreatePolygon.vue'
import SidebarRegisterFudepoly from './SidebarRegisterFudepoly.vue'
import SidebarUpdatePolygon from './SidebarUpdatePolygon.vue'
import SidebarDeletePolygon from './SidebarDeletePolygon.vue'
import FileImportDialog from './components/FileImportDialog.vue'

import {
  addSource,
  addLayer,
  removeSource,
  removeLayer,
  addEditLayer,
  removeEditLayer,
  addPMTilesSource,
  addPMTilesLayer,
  removePMTitlesSource,
  removePMTitlesLayer,
  setupTerraDraw,
} from './handler/LayerHandler'
import { useCreateLayerHandler } from './handler/useCreateLayerHandler'
import { useRegisterFudepolyHandler } from './handler/useRegisterFudepolyHandler'
import { useUpdateLayerHandler } from './handler/useUpdateLayerHandler'
import { useDeleteLayerHandler } from './handler/useDeleteLayerHandler'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'

import type { Draw, MaplibreRef } from '@/types/common'
const store = useStore()
const persistStore = usePersistStore()
const { isDesktop } = useControlScreenWidth()

const map = inject<MaplibreRef>('mapkey')
if (!map) throw new Error('Map instance not provided')
const draw = shallowRef<Draw>(null)

const mapLoaded = ref(false)
const createPolygonActive = ref(false)
const registerFudepolyActive = ref(false)
const updatePolygonActive = ref(false)
const deletePolygonActive = ref(false)
const isOpenFileImportDialog = ref(false)

const currentActiveName = computed(() => {
  if (createPolygonActive.value) return 'ポリゴンの新規作成'
  if (registerFudepolyActive.value) return '筆ポリゴンからの登録'
  if (updatePolygonActive.value) return 'ポリゴンの更新'
  if (deletePolygonActive.value) return 'ポリゴンの削除'
  return ''
})

const { isOpenDialog, drawOnFinish, drawOffFinish } = useCreateLayerHandler(draw)

const { onClickRegisterFudepolyLayer, offClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(
  map,
  draw,
)

const { updatePolygonId, onClickUpdateLayer, offClickUpdateLayer } = useUpdateLayerHandler(
  map,
  draw,
)
const { deletePolygonId, onClickDeleteLayer, offClickDeleteLayer } = useDeleteLayerHandler(map)

onMounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  mapInstance.on('load', mapOnLoad)
})

onBeforeUnmount(() => {
  const mapInstance = map?.value
  if (!mapInstance) return
  const drawInstance = draw?.value
  if (!drawInstance) return

  removeLayer(mapInstance)
  removeEditLayer(mapInstance)
  removeSource(mapInstance)
  removePMTitlesLayer(mapInstance)
  removePMTitlesSource(mapInstance)

  mapInstance.off('load', mapOnLoad)
  drawInstance.clear()
  drawInstance.stop()

  mapLoaded.value = false
  createPolygonActive.value = false
  registerFudepolyActive.value = false
  updatePolygonActive.value = false
  deletePolygonActive.value = false
})

function mapOnLoad() {
  const mapInstance = map?.value
  if (!mapInstance) return

  addSource(mapInstance, persistStore.featurecollection)
  addLayer(mapInstance)
  draw.value = setupTerraDraw(map)
  draw.value.start()
  mapLoaded.value = true
}

// 背景地図切り替え時の処理
watch(
  () => store.mapStyleIndex,
  () => {
    const mapInstance = map?.value
    if (!mapInstance) return
    const drawInstance = draw?.value
    if (!drawInstance) return

    drawInstance.clear()

    mapInstance.once('idle', () => {
      addSource(mapInstance, persistStore.featurecollection)

      const topMenu =
        !createPolygonActive.value &&
        !registerFudepolyActive.value &&
        !updatePolygonActive.value &&
        !deletePolygonActive.value

      if (topMenu) {
        addLayer(mapInstance)
      }

      if (createPolygonActive.value) {
        addLayer(mapInstance)
      }

      if (registerFudepolyActive.value) {
        addLayer(mapInstance)
        addPMTilesSource(mapInstance)
        addPMTilesLayer(mapInstance)
      }

      if (updatePolygonActive.value) {
        addEditLayer(mapInstance)
      }

      if (deletePolygonActive.value) {
        addEditLayer(mapInstance)
      }
    })
  },
)

watch(createPolygonActive, (isActive) => {
  const drawInstance = draw?.value
  if (!drawInstance) return

  if (isActive) {
    drawInstance.setMode('polygon')
    drawOnFinish()
  } else {
    drawInstance.setMode('static')
    drawOffFinish()
  }
})

watch(registerFudepolyActive, (isActive) => {
  const mapInstance = map?.value
  if (!mapInstance) return
  const drawInstance = draw?.value
  if (!drawInstance) return

  const zoomLevel = mapInstance.getZoom()

  if (zoomLevel <= 8) {
    store.setMessage('Error', '筆ポリゴンが表示されるズームレベルは8以上です')
    registerFudepolyActive.value = false
  }

  if (isActive) {
    addPMTilesSource(mapInstance)
    addPMTilesLayer(mapInstance)
    onClickRegisterFudepolyLayer()
  } else {
    removePMTitlesLayer(mapInstance)
    removePMTitlesSource(mapInstance)
    offClickRegisterFudepolyLayer()
  }
})

watch(updatePolygonActive, (isActive) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (isActive) {
    removeLayer(mapInstance)
    addEditLayer(mapInstance)
    onClickUpdateLayer()
  } else {
    removeEditLayer(mapInstance)
    addLayer(mapInstance)
    offClickUpdateLayer()
  }
})

watch(deletePolygonActive, (isActive) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (isActive) {
    removeLayer(mapInstance)
    addEditLayer(mapInstance)
    onClickDeleteLayer()
  } else {
    removeEditLayer(mapInstance)
    addLayer(mapInstance)
    offClickDeleteLayer()
  }
})

const onClickCreatePolygonBtn = () => (createPolygonActive.value = true)

const onClickRegisterFudepolyBtn = () => (registerFudepolyActive.value = true)

const onClickRegisterFileBtn = () => (isOpenFileImportDialog.value = true)

const onClickUpdatePolygonBtn = () => (updatePolygonActive.value = true)

const onClickDeletePolygonBtn = () => (deletePolygonActive.value = true)
</script>

<template>
  <main class="fixed top-16 h-[calc(100dvh-4rem)] w-screen lg:flex">
    <!-- sidebar -->
    <div
      :class="[
        isDesktop
          ? 'relative p-8 h-full bg-slate-100 min-w-90'
          : 'absolute p-2 m-2 w-[calc(100%-1rem)] bg-slate-100/80 rounded-md',
        'block z-20',
      ]"
    >
      <div v-if="isDesktop">
        <div class="mt-2 mb-6 text-center font-semibold text-lg">圃場ポリゴン管理</div>
        <div v-show="currentActiveName !== ''">
          <div
            class="bg-slate-200 text-slate-500 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm text-center"
          >
            {{ currentActiveName }}
          </div>
          <div class="w-full border-t border-slate-800 my-4"></div>
        </div>
      </div>

      <div v-show="mapLoaded" class="">
        <div
          v-if="currentActiveName == ''"
          :class="[
            isDesktop ? 'gird-cols-1 grid-rows-4' : 'grid-cols-5 grid-rows-1 text-xs sm:text-base',
            'grid lg:gap-4 gap-2 text-slate-800',
          ]"
        >
          <button
            type="button"
            @click="onClickCreatePolygonBtn"
            class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="createPolygonActive"
          >
            ポリゴン<br v-if="!isDesktop" />新規作成
          </button>
          <button
            type="button"
            @click="onClickRegisterFudepolyBtn"
            class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="registerFudepolyActive"
          >
            筆ポリ<br v-if="!isDesktop" />から登録
          </button>
          <button
            type="button"
            @click="onClickRegisterFileBtn"
            class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="registerFudepolyActive"
          >
            SHP<br v-if="!isDesktop" />から登録
          </button>
          <button
            type="button"
            @click="onClickUpdatePolygonBtn"
            class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="updatePolygonActive"
          >
            ポリゴン<br v-if="!isDesktop" />更新
          </button>
          <button
            type="button"
            @click="onClickDeletePolygonBtn"
            class="h-14 lg:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 lg:px-4 lg:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="deletePolygonActive"
          >
            ポリゴン<br v-if="!isDesktop" />削除
          </button>
        </div>

        <!-- ポリゴンの新規作成 -->
        <SidebarCreatePolygon
          v-if="createPolygonActive"
          v-model:map="map"
          v-model:draw="draw"
          v-model:create-polygon-active="createPolygonActive"
          v-model:is-open-dialog="isOpenDialog"
        />

        <!-- 筆ポリゴンからの登録 -->
        <SidebarRegisterFudepoly
          v-if="registerFudepolyActive"
          v-model:map="map"
          v-model:draw="draw"
          v-model:register-fudepoly-active="registerFudepolyActive"
        />

        <!-- ポリゴンの更新 -->
        <SidebarUpdatePolygon
          v-if="updatePolygonActive"
          v-model:map="map"
          v-model:draw="draw"
          v-model:update-polygon-id="updatePolygonId"
          v-model:update-polygon-active="updatePolygonActive"
        />

        <!-- ポリゴンの削除 -->
        <SidebarDeletePolygon
          v-if="deletePolygonActive"
          v-model:map="map"
          v-model:delete-polygon-id="deletePolygonId"
          v-model:delete-polygon-active="deletePolygonActive"
        />
      </div>
    </div>

    <MapBase />

    <FileImportDialog
      v-if="isOpenFileImportDialog"
      v-model:is-open-dialog="isOpenFileImportDialog"
    />
  </main>
</template>
