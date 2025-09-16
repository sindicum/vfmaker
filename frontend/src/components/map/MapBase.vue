<script setup lang="ts">
import { onMounted, onUnmounted, watch, inject, shallowRef } from 'vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { useMapInitialization } from '@/components/map/composables/useMapInitialization'
import { useMapEventListeners } from '@/components/map/composables/useMapEventListeners'
import { useMapGeolocation } from '@/components/map/composables/useMapGeolocation'
import { useNetworkStatus } from '@/components/common/composables/useNetworkStatus'
import { useErrorHandler, createNetworkError } from '@/errors'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { MapLibreMapRef } from '@/types/map.type'

const store = useStore()
const persistStore = usePersistStore()

const { handleError } = useErrorHandler()
const { isOnline } = useNetworkStatus()

const mapStyleProperty = [
  {
    name: 'Open Street Map',
    url: 'https://tile.openstreetmap.jp/styles/maptiler-basic-ja/style.json',
  },
  {
    name: 'MapTiler',
    url: `https://api.maptiler.com/maps/hybrid/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
  },
]

const mapContainer = shallowRef<HTMLDivElement | null>(null)
const map = inject<MapLibreMapRef>('mapkey')
if (!map) throw new Error('Map instance not provided')

// Composablesの初期化
const { createMapInstance, handleMapInitializationError } = useMapInitialization({
  mapStyleProperty,
  map,
})

const { setupMapEventListeners } = useMapEventListeners({
  mapStyleProperty,
  map,
})

const { setupMapControls } = useMapGeolocation({ map })

onMounted(() => {
  initializeMap()
})

watch(
  () => store.mapStyleIndex,
  async () => {
    const mapInstance = map?.value
    if (!mapInstance) return

    try {
      store.isLoading = true

      // スタイルを変更
      const mapStyleIndex = store.mapStyleIndex
      mapInstance.setStyle(mapStyleProperty[mapStyleIndex].url, { diff: true })

      await new Promise((resolve) => {
        mapInstance.once('styledata', resolve)
      })
    } catch (error) {
      handleError(
        createNetworkError('style_change', error as Error, {
          newStyleIndex: store.mapStyleIndex,
          newStyleUrl: mapStyleProperty[store.mapStyleIndex].url,
        }),
      )
    } finally {
      store.isLoading = false
    }
  },
)

onUnmounted(() => {
  cleanupMap()
})

function initializeMap() {
  const container = mapContainer.value
  if (!container) return

  try {
    store.isLoading = true

    createMapInstance(container)
    setupMapEventListeners()
    setupMapControls()
    store.mapLoaded = true

    const mapInstance = map?.value
    if (!mapInstance) {
      const error = new Error(
        'Map instance creation failed: map.value is null after initialization',
      )
      handleMapInitializationError(error, container)
      return
    }

    mapInstance.on('moveend', setMapPosition)
  } catch (error) {
    handleMapInitializationError(error, container)
  } finally {
    store.isLoading = false
  }
}

function cleanupMap() {
  const mapInstance = map?.value
  if (!mapInstance) return
  mapInstance.off('moveend', setMapPosition)
  mapInstance.remove()
  map.value = null
}

function setMapPosition() {
  const mapInstance = map?.value
  if (!mapInstance) return
  const center = mapInstance.getCenter()
  const zoom = mapInstance.getZoom()

  persistStore.centerPosition.lat = center.lat
  persistStore.centerPosition.lng = center.lng
  persistStore.centerPosition.zoom = zoom
}
</script>

<template>
  <div ref="mapContainer" class="relative h-full w-full z-0">
    <!-- ネットワーク状態インジケーター -->

    <div
      v-if="!isOnline"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 bg-red-500 text-white rounded-md shadow-lg"
    >
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span class="text-sm font-medium">オフライン</span>
      </div>
    </div>

    <!-- 地図スタイル選択 -->
    <div
      class="absolute bottom-10 right-2 lg:top-2 lg:left-2 px-4 lg:p-4 h-fit w-fit rounded-3xl lg:rounded-md bg-white/90 z-10"
    >
      <fieldset role="radiogroup">
        <div class="grid grid-cols-2 lg:grid-cols-1 gap-2">
          <label
            class="relative flex items-start"
            v-for="(map_style, index) in mapStyleProperty"
            :key="map_style.name"
          >
            <div class="flex h-6 items-center">
              <input
                type="radio"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                v-model="store.mapStyleIndex"
                :value="index"
                role="radio"
                :disabled="!isOnline"
              />
            </div>
            <div
              class="ml-3 text-xs lg:text-sm leading-6"
              :class="isOnline ? 'text-gray-900' : 'text-gray-400'"
            >
              {{ map_style.name }}
            </div>
          </label>
        </div>
      </fieldset>
    </div>
  </div>
</template>
