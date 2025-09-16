import { ref } from 'vue'
import { defineStore } from 'pinia'

export const usePersistStore = defineStore(
  'persistStore',
  () => {
    const centerPosition = ref({ lng: 142.5, lat: 43.5, zoom: 7 })

    return {
      centerPosition,
    }
  },
  { persist: true },
)
