<script setup lang="ts">
import { inject, onMounted, watch, ref, shallowRef, computed } from 'vue'
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
import { useControlScreenWidth } from '@/components/useControlScreenWidth'

import type { Draw, MaplibreRef } from '@/types/maplibre'
import { addPMtiles, addEditLayer, removeLayer } from './handler/LayerHandler'

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

const currentActiveName = computed(() => {
  if (createPolygonActive.value) return 'ポリゴンの新規作成'
  if (registerFudepolyActive.value) return '筆ポリゴンからの登録'
  if (updatePolygonActive.value) return 'ポリゴンの更新'
  if (deletePolygonActive.value) return 'ポリゴンの削除'
  return ''
})

const MESSAGE = {
  NOT_SELECTED: '筆ポリゴンを選択して下さい',
  SOURCE_NOT_FOUND: 'ソースが見つかりません',
  MAP_NOT_READY: '地図インスタンスが初期化されていません',
  DRAW_NOT_READY: 'Drawインスタンスが初期化されていません',
}

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

const onClickCreatePolygonBtn = () => {
  createPolygonActive.value = true
  draw.value?.setMode('polygon')
}

const onClickRegisterFudepolyBtn = () => {
  if (!map.value) {
    console.error(MESSAGE.MAP_NOT_READY)
    return
  }
  if (!draw.value) {
    console.error(MESSAGE.DRAW_NOT_READY)
    return
  }

  registerFudepolyActive.value = true
  addPMtiles(map.value, draw.value)
}

const onClickUpdatePolygonBtn = () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  updatePolygonActive.value = true
  removeLayer(mapInstance)
  addEditLayer(mapInstance)
}

const onClickDeletePolygonBtn = () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  deletePolygonActive.value = true
  removeLayer(mapInstance)
  addEditLayer(mapInstance)
}
</script>

<template>
  <main class="md:flex h-[calc(100vh-4rem)] w-screen">
    <!-- sidebar -->
    <div
      :class="[
        isDesktop
          ? 'relative p-8 h-full bg-slate-100 min-w-84'
          : 'absolute p-2 m-2 w-[calc(100%-1rem)] bg-slate-100/80 rounded-md',
        'block z-20',
      ]"
    >
      <div v-if="isDesktop">
        <div class="mt-2 mb-6 text-center font-semibold">圃場登録管理</div>
        <div v-show="currentActiveName !== ''">
          <div
            class="bg-slate-200 text-slate-500 flex-1 w-full justify-center px-4 py-2 rounded-md border border-transparent shadow-sm text-center"
          >
            {{ currentActiveName }}
          </div>
          <div class="w-full border-t border-slate-800 my-4"></div>
        </div>
      </div>

      <div v-if="!isDesktop" class="flex flex-row font-semibold mx-2 my-1">
        <div class="pb-2">圃場登録管理</div>
        <div v-show="currentActiveName !== ''" class="">
          <span class="mx-4">></span>{{ currentActiveName }}
        </div>
      </div>

      <div v-show="mapLoaded" class="">
        <div
          v-if="currentActiveName == ''"
          :class="[
            isDesktop ? 'gird-cols-1 grid-rows-4' : 'grid-cols-4 grid-rows-1 text-sm sm:text-base',
            'grid md:gap-4 gap-2 text-slate-800',
          ]"
        >
          <button
            type="button"
            @click="onClickCreatePolygonBtn"
            class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="createPolygonActive"
          >
            ポリゴンの<br v-if="!isDesktop" />新規作成
          </button>
          <button
            type="button"
            @click="onClickRegisterFudepolyBtn"
            class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="registerFudepolyActive"
          >
            筆ポリゴン<br v-if="!isDesktop" />からの登録
          </button>
          <button
            type="button"
            @click="onClickUpdatePolygonBtn"
            class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="updatePolygonActive"
          >
            ポリゴンの<br v-if="!isDesktop" />更新
          </button>
          <button
            type="button"
            @click="onClickDeletePolygonBtn"
            class="h-14 md:h-auto bg-amber-300 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-900 flex-1 w-full justify-center py-1 md:px-4 md:py-2 rounded-md border border-transparent shadow-sm"
            v-bind:disabled="deletePolygonActive"
          >
            ポリゴンの<br v-if="!isDesktop" />削除
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

    <!-- main map -->
    <div class="h-full w-full">
      <MapBase />
    </div>
  </main>
</template>
