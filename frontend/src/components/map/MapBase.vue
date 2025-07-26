<script setup lang="ts">
import { onMounted, onUnmounted, watch, inject, shallowRef, ref } from 'vue'
import {
  Map as MaplibreMapObject,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
} from 'maplibre-gl'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'

import { useControlScreenWidth } from '@/composables/useControlScreenWidth'
import {
  useErrorHandler,
  createNetworkError,
  createPermissionError,
  createGeneralError,
} from '@/errors'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

import 'maplibre-gl/dist/maplibre-gl.css'
import type { Source } from 'maplibre-gl'
import type { MaplibreRef } from '@/types/maplibre'

const store = useStore()
const persistStore = usePersistStore()
const { isDesktop } = useControlScreenWidth()
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
const map = inject<MaplibreRef>('mapkey')
if (!map) throw new Error('Map instance not provided')

const lastUpdateTime = ref(0)

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
      handleError(
        createNetworkError('map_load_error', e.error || new Error('Map loading failed'), {
          styleUrl: mapStyleProperty[mapStyleIndex].url,
          center: [persistStore.centerPosition.lng, persistStore.centerPosition.lat],
          zoom: persistStore.centerPosition.zoom,
          mapError: e,
        }),
      )
    })

    // ソースエラーイベントリスナーを追加
    map.value.on('sourcedata', (e) => {
      if (
        e.isSourceLoaded &&
        e.source &&
        map.value?.getSource((e.source as Source).id)?.loaded?.() === false
      ) {
        // ソースの読み込みに失敗した場合
        const sourceError = new Error(`Failed to load source: ${(e.source as Source).id}`)
        handleError(
          createNetworkError('source_load_error', sourceError, {
            sourceId: (e.source as Source).id,
            sourceType: e.source.type,
          }),
          {
            showUserNotification: false, // ソースエラーは通知しない
            logToConsole: true,
          },
        )
      }
    })

    // スタイル読み込み状態管理イベントリスナーを追加
    map.value.on('styledataloading', () => {
      store.isLoading = true
    })

    map.value.on('styledata', () => {
      store.isLoading = false
    })

    map.value.on('idle', () => {
      store.isLoading = false
    })

    const geolocateControl = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      showUserLocation: true,
      trackUserLocation: true,
      showAccuracyCircle: false,
    })

    map.value.addControl(new ScaleControl())
    map.value.addControl(new NavigationControl(), isDesktop.value ? 'top-right' : 'bottom-left')
    map.value.addControl(geolocateControl, isDesktop.value ? 'top-right' : 'bottom-left')

    geolocateControl.on('geolocate', (e) => {
      const currentTime = Date.now()
      const UPDATE_INTERVAL = 2000

      if (currentTime - lastUpdateTime.value < UPDATE_INTERVAL) {
        return
      }

      lastUpdateTime.value = currentTime

      // e.coords には GeolocationPosition.coords が入っている
      const latitude = e.coords.latitude
      const longitude = e.coords.longitude
      // storeに緯度経度を保存
      store.currentGeolocation = { lat: latitude, lng: longitude }
    })

    geolocateControl.on('trackuserlocationend', () => {
      // 追跡が終了した場合に緯度経度をリセット
      store.currentGeolocation = { lat: null, lng: null }
    })

    geolocateControl.on('error', (error) => {
      let appError

      switch (error.code) {
        case error.PERMISSION_DENIED:
          appError = createPermissionError('位置情報', 'アクセス', {
            errorCode: error.code,
            message: error.message,
          })
          appError.userMessage = '位置情報の利用が拒否されました。ブラウザの設定をご確認ください。'
          break

        case error.POSITION_UNAVAILABLE:
          appError = createGeneralError(
            '位置情報取得エラー: POSITION_UNAVAILABLE',
            '現在位置が取得できませんでした。',
            undefined,
            error,
            { errorCode: error.code },
          )
          break

        case error.TIMEOUT:
          appError = createNetworkError('geolocation_timeout', error, { errorCode: error.code })
          appError.userMessage = '位置情報の取得がタイムアウトしました。'
          break

        default:
          appError = createGeneralError(
            '位置情報取得エラー',
            '位置情報の取得中に予期しないエラーが発生しました。',
            undefined,
            error,
            { errorCode: error.code },
          )
      }

      handleError(appError, {
        logToConsole: import.meta.env.MODE !== 'production',
      })
    })

    store.mapLoaded = true
    map.value.on('moveend', setMapPosition)
  } catch (error) {
    const isNetworkError =
      (error as Error).message?.toLowerCase().includes('network') ||
      (error as Error).message?.toLowerCase().includes('fetch')

    const appError = isNetworkError
      ? createNetworkError('map_initialization', error as Error, {
          containerElement: !!container,
          styleIndex: store.mapStyleIndex,
        })
      : createGeneralError(
          `地図初期化エラー: ${(error as Error).message}`,
          '地図の初期化に失敗しました。ページを再読み込みしてください。',
          undefined,
          error as Error,
          {
            containerElement: !!container,
            styleIndex: store.mapStyleIndex,
          },
        )

    handleError(appError)
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
        createNetworkError('style_change', error as Error, {
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
