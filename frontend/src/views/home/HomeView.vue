<script setup lang="ts">
import { onMounted, watch, inject, ref, onBeforeUnmount } from 'vue'
import MapBase from '@/components/map/MapBase.vue'

import { useHumusCog } from '@/composables/useHumusCog'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import type { ShallowRef } from 'vue'
import type { MaplibreMap } from '@/types/maplibre'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'
import {
  addLayer,
  addSource,
  removeLayer,
  removeSource,
} from '../create-variable-fertilization/handler/LayerHandler'

const map = inject<ShallowRef<MaplibreMap | null>>('mapkey')
const { addCog, removeCog } = useHumusCog(map)
const isCogLayerVisible = ref(true)
const store = useStore()
const persistStore = usePersistStore()

const { isDesktop } = useControlScreenWidth()

onMounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  mapInstance.on('style.load', async () => {
    await addCog()
    addSource(mapInstance, persistStore.featurecollection)
    addLayer(mapInstance)
  })
})

onBeforeUnmount(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  removeLayer(mapInstance)
  removeSource(mapInstance)
  removeCog()
})

watch(
  () => store.mapStyleIndex,
  () => {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.once('idle', async () => {
      if (isCogLayerVisible.value) {
        await addCog()

        addSource(mapInstance, persistStore.featurecollection)
        addLayer(mapInstance)
      }
    })
  },
)

watch(isCogLayerVisible, async () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (isCogLayerVisible.value) {
    await addCog()
    if (mapInstance.getLayer('registeredFillLayer')) {
      mapInstance.moveLayer('cogLayer', 'registeredFillLayer')
    }
  } else {
    removeCog()
  }
})
</script>

<template>
  <main class="fixed top-16 h-[calc(100dvh-4rem)] w-screen">
    <MapBase />
    <div
      :class="[
        isDesktop
          ? 'top-25 left-2 w-fit h-fit py-4 rounded-md flex-col gap-2'
          : 'bottom-17 right-2 py-1 rounded-3xl flex-row gap-x-3',
        'absolute px-4  bg-white/90 z-10 flex',
      ]"
    >
      <label class="flex items-center space-x-2">
        <input type="checkbox" v-model="isCogLayerVisible" />
        <span class="text-sm">腐植マップ表示</span>
      </label>

      <!-- 帯状グラデーション凡例 -->
      <div v-if="isCogLayerVisible" class="text-xs flex items-center justify-center">
        <!-- グラデーション帯 -->
        <div class="mr-1">0</div>
        <div class="relative w-16 h-4 border border-gray-300">
          <div
            class="absolute inset-0"
            style="
              background: linear-gradient(
                to right,
                #d7191c 0%,
                #f07c4a 16.67%,
                #fec980 33.33%,
                #ffffbf 50%,
                #c7e8ad 66.67%,
                #80bfab 83.33%,
                #2b83ba 100%
              );
            "
          ></div>
        </div>
        <div class="ml-1">150mg/kg</div>
      </div>
    </div>
  </main>
</template>
