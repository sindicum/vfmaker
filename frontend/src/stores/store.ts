import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { GeolocateControl } from 'maplibre-gl'

export const useStore = defineStore('store', () => {
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

  const reset = () => {
    currentPage.value = 0
    mapLoaded.value = false
    mapStyleIndex.value = 0
  }

  return {
    mapLoaded,
    currentPage,
    mapStyleIndex,
    isLoading,
    currentGeolocation,
    geolocateControl,
    isTracking,
    reset,
  }
})
