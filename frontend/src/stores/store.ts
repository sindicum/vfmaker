import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { GeolocateControl } from 'maplibre-gl'

type alertType = 'Error' | 'Info' | ''

export const useStore = defineStore('store', () => {
  const alertMessage = ref<{ alertType: alertType; message: string }>({
    alertType: '',
    message: '',
  })
  const currentPage = ref(0)
  const mapLoaded = ref(false)
  const mapStyleIndex = ref(0)
  const isLoading = ref(false)
  const currentGeolocation = ref({
    lat: null,
    lng: null,
  })
  const geolocateControl = shallowRef<GeolocateControl | null>(null)
  const isTracking = ref<boolean | null>(null)

  const setMessage = (alertType: alertType, message: string) => {
    alertMessage.value.alertType = alertType
    alertMessage.value.message = message
  }

  const reset = () => {
    alertMessage.value.alertType = ''
    alertMessage.value.message = ''
    currentPage.value = 0
    mapLoaded.value = false
    mapStyleIndex.value = 0
  }

  return {
    mapLoaded,
    alertMessage,
    currentPage,
    mapStyleIndex,
    isLoading,
    currentGeolocation,
    geolocateControl,
    isTracking,
    setMessage,
    reset,
  }
})
