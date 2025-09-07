import { ref } from 'vue'
import { GeolocateControl, NavigationControl, ScaleControl } from 'maplibre-gl'
import { useStore } from '@/stores/store'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'
import {
  useErrorHandler,
  createNetworkError,
  createPermissionError,
  createGeneralError,
} from '@/errors'
import type { MaplibreRef } from '@/types/common'

interface UseMapGeolocationOptions {
  map: MaplibreRef
}

export function useMapGeolocation({ map }: UseMapGeolocationOptions) {
  const store = useStore()
  const { isDesktop } = useControlScreenWidth()
  const { handleError } = useErrorHandler()
  const lastUpdateTime = ref(0)

  function createGeolocateControl() {
    return new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      showUserLocation: true,
      trackUserLocation: true,
      showAccuracyCircle: false,
      fitBoundsOptions: {
        maxZoom: 15.5,
      },
    })
  }

  function setupGeolocateEventListeners(geolocateControl: GeolocateControl) {
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

    geolocateControl.on('trackuserlocationstart', () => {
      store.isTracking = true
    })

    geolocateControl.on('trackuserlocationend', () => {
      // 追跡が終了した場合に緯度経度をリセット
      store.currentGeolocation = { lat: null, lng: null }
      store.isTracking = false
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
  }

  function setupMapControls() {
    const control = createGeolocateControl()
    store.geolocateControl = control

    map.value!.addControl(new ScaleControl())
    map.value!.addControl(new NavigationControl(), isDesktop.value ? 'top-right' : 'bottom-left')
    map.value!.addControl(control, isDesktop.value ? 'top-right' : 'bottom-left')

    setupGeolocateEventListeners(control)
  }

  return {
    setupMapControls,
  }
}
