import type { Source } from 'maplibre-gl'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { useErrorHandler, createNetworkError } from '@/errors'
import type { MapLibreMapRef } from '@/types/map.type'
interface MapStyleProperty {
  name: string
  url: string
}

interface UseMapEventListenersOptions {
  mapStyleProperty: MapStyleProperty[]
  map: MapLibreMapRef
}

export function useMapEventListeners({ mapStyleProperty, map }: UseMapEventListenersOptions) {
  const store = useStore()
  const persistStore = usePersistStore()
  const { handleError } = useErrorHandler()

  function setupMapEventListeners() {
    const mapStyleIndex = store.mapStyleIndex

    // 地図のエラーイベントリスナーを追加
    map.value!.on('error', (e) => {
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
    map.value!.on('sourcedata', (e) => {
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
    map.value!.on('styledataloading', () => {
      store.isLoading = true
    })

    map.value!.on('styledata', () => {
      store.isLoading = false
    })

    map.value!.on('idle', () => {
      store.isLoading = false
    })
  }

  return {
    setupMapEventListeners,
  }
}
