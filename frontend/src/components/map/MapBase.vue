<script setup lang="ts">
import { onMounted, onUnmounted, watch, inject, shallowRef } from 'vue'
import {
  Map as MaplibreMapObject,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
} from 'maplibre-gl'
import { useStore, usePersistStore } from '@/stores/store'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

import type { AppError } from '@/types/error'
import { ErrorCategory, ErrorSeverity } from '@/types/error'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { MaplibreRef } from '@/types/maplibre'

const store = useStore()
const persistStore = usePersistStore()
const { isDesktop } = useControlScreenWidth()
const { handleError } = useErrorHandler()
const { isOnline } = useNetworkStatus()

const createMapError = (
  operation: string,
  error: Error,
  context?: Record<string, unknown>,
): AppError => ({
  id: `map_error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  category: ErrorCategory.NETWORK,
  severity: ErrorSeverity.MEDIUM,
  message: `地図エラー: ${operation} - ${error.message}`,
  userMessage: 'ネットワーク接続を確認してページを再読み込みしてください',
  timestamp: new Date(),
  context: { operation, ...context },
  originalError: error,
})

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
const map = inject<MaplibreRef>('mapkey')
if (!map) throw new Error('Map instance not provided')

onMounted(() => {
  const container = mapContainer.value
  if (!container) return

  try {
    const mapStyleIndex = store.mapStyleIndex
    map.value = new MaplibreMapObject({
      container: container,
      style: mapStyleProperty[mapStyleIndex].url,
      center: [persistStore.centerPosition.lng, persistStore.centerPosition.lat],
      zoom: persistStore.centerPosition.zoom,
      hash: true,
    })

    // 地図のエラーイベントリスナーを追加
    map.value.on('error', (e) => {
      console.error('MapLibre GL error:', e)
      handleError(
        createMapError('map_load_error', e.error || new Error('Map loading failed'), {
          styleUrl: mapStyleProperty[mapStyleIndex].url,
          center: [persistStore.centerPosition.lng, persistStore.centerPosition.lat],
          zoom: persistStore.centerPosition.zoom,
        }),
      )
    })

    // ソースエラーイベントリスナーを追加
    map.value.on('sourcedata', (e) => {
      if (e.isSourceLoaded && e.source && map.value?.getSource(e.source.id)?.loaded === false) {
        // ソースの読み込みに失敗した場合
        const sourceError = new Error(`Failed to load source: ${e.source.id}`)
        handleError(
          createMapError('source_load_error', sourceError, {
            sourceId: e.source.id,
            sourceType: e.source.type,
          }),
        )
      }
    })

    // スタイルエラーイベントリスナーを追加
    map.value.on('styledataloading', () => {
      store.isLoading = true
    })

    map.value.on('styledata', () => {
      store.isLoading = false
    })

    map.value.on('idle', () => {
      store.isLoading = false
    })

    map.value.addControl(new ScaleControl())
    map.value.addControl(new NavigationControl(), isDesktop.value ? 'top-right' : 'bottom-left')

    map.value.addControl(
      new GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      isDesktop.value ? 'top-right' : 'bottom-left',
    )

    store.mapLoaded = true
    map.value.on('moveend', setMapPosition)
  } catch (error) {
    handleError(
      createMapError('map_initialization', error as Error, {
        containerElement: !!container,
        styleIndex: store.mapStyleIndex,
      }),
    )
  }
})

watch(
  () => store.mapStyleIndex,
  () => {
    const mapInstance = map?.value
    if (!mapInstance) return

    try {
      // スタイルを変更
      const mapStyleIndex = store.mapStyleIndex
      store.isLoading = true
      mapInstance.setStyle(mapStyleProperty[mapStyleIndex].url, { diff: true })
    } catch (error) {
      store.isLoading = false
      handleError(
        createMapError('style_change', error as Error, {
          newStyleIndex: store.mapStyleIndex,
          newStyleUrl: mapStyleProperty[store.mapStyleIndex].url,
        }),
      )
    }
  },
)
onUnmounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return
  mapInstance.off('moveend', setMapPosition)
  mapInstance.remove()
  map.value = null
})

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
      class="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 bg-red-500 text-white rounded-md shadow-lg"
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
      class="absolute bottom-10 right-2 md:top-2 md:left-2 px-4 md:p-4 h-fit w-fit rounded-3xl md:rounded-md bg-white/90 z-10"
    >
      <fieldset role="radiogroup">
        <div class="grid grid-cols-2 md:grid-cols-1 gap-2">
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
              class="ml-3 text-xs md:text-sm leading-6"
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
