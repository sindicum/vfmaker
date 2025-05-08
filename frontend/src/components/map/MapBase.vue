<script setup lang="ts">
import { onMounted, onUnmounted, watch, inject, shallowRef } from 'vue'
import {
  Map as MaplibreMapObject,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
} from 'maplibre-gl'
import { useStore, usePersistStore } from '@/stores/store'
import { useControlScreenWidth } from '@/components/useControlScreenWidth'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { MaplibreRef } from '@/types/maplibre'

const store = useStore()
const persistStore = usePersistStore()
const { isDesktop } = useControlScreenWidth()

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

  const mapStyleIndex = store.mapStyleIndex
  map.value = new MaplibreMapObject({
    container: container,
    style: mapStyleProperty[mapStyleIndex].url,
    center: [persistStore.centerPosition.lng, persistStore.centerPosition.lat],
    zoom: persistStore.centerPosition.zoom,
    hash: true,
  })

  map.value.addControl(new NavigationControl(), isDesktop.value ? 'top-right' : 'bottom-left')

  map.value.addControl(new ScaleControl())

  map.value.addControl(
    new GeolocateControl({
      positionOptions: {
        // より精度の高い位置情報を取得する
        enableHighAccuracy: true,
      },
      // ユーザーが移動するたびに位置を自動的に更新
      trackUserLocation: true,
    }),
  )
  store.mapLoaded = true
  map.value.on('moveend', setMapPosition)
})

watch(
  () => store.mapStyleIndex,
  () => {
    const mapInstance = map?.value
    if (!mapInstance) return

    // スタイルを変更
    const mapStyleIndex = store.mapStyleIndex
    mapInstance.setStyle(mapStyleProperty[mapStyleIndex].url, { diff: true })
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

  persistStore.centerPosition.lat = Math.round(center.lat * 100) / 100
  persistStore.centerPosition.lng = Math.round(center.lng * 100) / 100
  persistStore.centerPosition.zoom = Math.round(zoom * 100) / 100
}
</script>

<template>
  <div ref="mapContainer" class="relative h-full w-full z-0">
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
              />
            </div>
            <div class="ml-3 text-xs md:text-sm leading-6 text-gray-900">
              {{ map_style.name }}
            </div>
          </label>
        </div>
      </fieldset>
    </div>
  </div>
</template>
