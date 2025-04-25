<script setup lang="ts">
import { inject, onMounted, watch, ref, shallowRef } from 'vue'
import { usePersistStore, useStore } from '@/stores/store'

import MapBase from '@/components/map/MapBase.vue'
import SidebarCreatePolygon from './SidebarCreatePolygon.vue'
import SidebarRegisterFudepoly from './SidebarRegisterFudepoly.vue'
import SidebarUpdatePolygon from './SidebarUpdatePolygon.vue'
import SidebarDeletePolygon from './SidebarDeletePolygon.vue'

import { addSource, addLayer, setupTerraDraw } from './handler/LayerHandler'
import { useDrawHandler } from './handler/useDrawHandler'
import { useDeleteLayerHandler } from './handler/useDeleteLayerHandler'
import { useUpdateLayerHandler } from './handler/useUpdateLayerHandler'

import type { Draw, MaplibreRef } from '@/types/maplibre'

const store = useStore()
const persistStore = usePersistStore()

const map = inject<MaplibreRef>('mapkey')
if (!map) throw new Error('Map instance not provided')

const draw = shallowRef<Draw>(null)
const mapLoaded = ref(false)

const createPolygonActive = ref(false)
const registerFudepolyActive = ref(false)
const updatePolygonActive = ref(false)
const deletePolygonActive = ref(false)

const { isOpenDialog, drawOnFinish, drawOffFinish } = useDrawHandler(draw)
const { deletePolygonId, onClickDeleteLayer, offClickDeleteLayer } = useDeleteLayerHandler(map)
const { updatePolygonId, onClickUpdateLayer, offClickUpdateLayer } = useUpdateLayerHandler(
  map,
  draw,
)

onMounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  mapInstance.on('load', () => {
    addSource(mapInstance, persistStore.featurecollection)
    addLayer(mapInstance)
    draw.value = setupTerraDraw(map)
    draw.value.start()
    mapLoaded.value = true
  })
})

watch(
  () => store.mapStyleIndex,
  () => {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.once('idle', () => {
      addSource(mapInstance, persistStore.featurecollection)
      addLayer(mapInstance)
    })
  },
)

watch(createPolygonActive, (isActive) => {
  if (isActive) {
    drawOnFinish()
  } else {
    drawOffFinish()
  }
})

watch(updatePolygonActive, (isActive) => {
  if (isActive) {
    onClickUpdateLayer()
  } else {
    offClickUpdateLayer()
  }
})

watch(deletePolygonActive, (isActive) => {
  if (isActive) {
    onClickDeleteLayer()
  } else {
    offClickDeleteLayer()
  }
})
</script>

<template>
  <main class="flex h-[calc(100vh-4rem)] w-screen">
    <!-- sidebar -->
    <div class="block min-w-84 bg-slate-100 h-full p-8 z-10">
      <div class="mt-2 mb-6 font-semibold text-center">圃場ポリゴンの管理</div>
      <div v-show="mapLoaded" class="flex flex-col gap-4 text-slate-800">
        <!-- ポリゴンの新規作成 -->
        <SidebarCreatePolygon
          v-if="!registerFudepolyActive && !updatePolygonActive && !deletePolygonActive"
          v-model:map="map"
          v-model:draw="draw"
          v-model:create-polygon-active="createPolygonActive"
          v-model:is-open-dialog="isOpenDialog"
        />

        <!-- 筆ポリゴンからの登録 -->
        <SidebarRegisterFudepoly
          v-if="!createPolygonActive && !updatePolygonActive && !deletePolygonActive"
          v-model:map="map"
          v-model:draw="draw"
          v-model:register-fudepoly-active="registerFudepolyActive"
        />

        <!-- ポリゴンの更新 -->
        <SidebarUpdatePolygon
          v-if="!createPolygonActive && !registerFudepolyActive && !deletePolygonActive"
          v-model:map="map"
          v-model:draw="draw"
          v-model:update-polygon-id="updatePolygonId"
          v-model:update-polygon-active="updatePolygonActive"
        />

        <!-- ポリゴンの削除 -->
        <SidebarDeletePolygon
          v-if="!createPolygonActive && !registerFudepolyActive && !updatePolygonActive"
          v-model:map="map"
          v-model:delete-polygon-id="deletePolygonId"
          v-model:delete-polygon-active="deletePolygonActive"
        />
      </div>
    </div>

    <!-- main map -->
    <div class="z-0 h-full w-full">
      <MapBase />
    </div>
  </main>
</template>
