import { Map as MaplibreMapObject } from 'maplibre-gl'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { useErrorHandler, createNetworkError, createGeneralError } from '@/errors'
import type { MaplibreRef } from '@/types/common'

interface MapStyleProperty {
  name: string
  url: string
}

interface UseMapInitializationOptions {
  mapStyleProperty: MapStyleProperty[]
  map: MaplibreRef
}

export function useMapInitialization({ mapStyleProperty, map }: UseMapInitializationOptions) {
  const store = useStore()
  const persistStore = usePersistStore()
  const { handleError } = useErrorHandler()

  function createMapInstance(container: HTMLDivElement) {
    const mapStyleIndex = store.mapStyleIndex
    map.value = new MaplibreMapObject({
      container: container,
      style: mapStyleProperty[mapStyleIndex].url,
      center: [persistStore.centerPosition.lng, persistStore.centerPosition.lat],
      zoom: persistStore.centerPosition.zoom,
      hash: true,
    })
  }

  function handleMapInitializationError(error: unknown, container: HTMLDivElement) {
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

  return {
    createMapInstance,
    handleMapInitializationError,
  }
}
