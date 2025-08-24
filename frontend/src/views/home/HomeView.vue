<script setup lang="ts">
import { onMounted, watch, inject, ref, onBeforeMount } from 'vue'

import MapBase from '@/components/map/MapBase.vue'
import HumusMapLegend from '@/components/map/HumusMapLegend.vue'
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
const { addCog } = useHumusCog(map)
const isCogLayerVisible = ref(false)
const store = useStore()
const persistStore = usePersistStore()

const { isDesktop } = useControlScreenWidth()

onBeforeMount(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  removeLayer(mapInstance)
  removeSource(mapInstance)
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
  } else {
    mapInstance.removeLayer('cogLayer')
    mapInstance.removeSource('cogSource')
  }
})
</script>

<template>
  <main class="fixed top-16 h-[calc(100dvh-4rem)] w-screen">
    <MapBase />
    <HumusMapLegend class="absolute top-1/2 -translate-y-1/2 right-3" />
    <div
      :class="[
        isDesktop
          ? 'top-25 left-2 w-42 h-fit py-2 rounded-md'
          : 'bottom-17 right-2 py-0.5 rounded-3xl',
        'absolute px-4 bg-white/90 z-10',
      ]"
    >
      <label class="flex items-center space-x-2">
        <input type="checkbox" v-model="isCogLayerVisible" />
        <span class="text-sm">腐植マップ表示</span>
      </label>
    </div>
  </main>
</template>
