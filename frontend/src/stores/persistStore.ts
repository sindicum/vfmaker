import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useStore } from './store'

import type { FeatureCollection, Feature, Polygon } from 'geojson'

export const usePersistStore = defineStore(
  'persistStore',
  () => {
    const maxFeatures: number = 10
    const store = useStore()
    const featurecollection = ref<FeatureCollection<Polygon, { id: string }>>({
      type: 'FeatureCollection',
      features: [],
    })
    const centerPosition = ref({ lng: 142.5, lat: 43.5, zoom: 7 })

    const addFeature = (feature: Feature<Polygon>) => {
      if (feature.id === undefined) {
        console.warn('feature.id が undefined です')
        return
      }
      const id = String(feature.id)

      const geometry = feature.geometry
      if (featurecollection.value.features.length < maxFeatures) {
        featurecollection.value.features.push({
          type: 'Feature',
          geometry: geometry,
          properties: { id: id },
        })
        store.alertMessage.alertType = 'Info'
        store.alertMessage.message = 'ポリゴンを登録しました'
      } else {
        store.alertMessage.alertType = 'Error'
        store.alertMessage.message = `ポリゴン登録上限（${maxFeatures}筆）に達してます`
      }
    }

    const clearFeatureCollection = () => {
      featurecollection.value.features = []
    }

    return {
      featurecollection,
      centerPosition,
      addFeature,
      clearFeatureCollection,
    }
  },
  { persist: true },
)
