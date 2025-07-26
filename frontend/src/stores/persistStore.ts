import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useStore } from './store'

import type { FeatureCollection, Feature, Polygon } from 'geojson'

export interface VariableFertilizationMap {
  featureCollection: FeatureCollection
  id: string
  createdAt: string
  totalAmount: number
  area: number
}

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

    const variableFertilizationMaps = ref<VariableFertilizationMap[]>([])

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

    const addViewVariableFertilizationMap = (
      features: Feature<Polygon>[],
      activeFeatureId: string,
      totalAmount: number,
      area: number,
    ) => {
      variableFertilizationMaps.value.push({
        featureCollection: {
          type: 'FeatureCollection',
          features: features,
        },
        id: activeFeatureId,
        createdAt: new Date().toISOString(),
        totalAmount: totalAmount,
        area: area,
      })
    }

    const clearFeatureCollection = () => {
      featurecollection.value.features = []
    }

    const clearViewVariableFertilizationMap = () => {
      variableFertilizationMaps.value = []
    }

    const removeVariableFertilizationMap = (id: string) => {
      const index = variableFertilizationMaps.value.findIndex((vfm) => vfm.id === id)
      if (index !== -1) {
        variableFertilizationMaps.value.splice(index, 1)
      }
    }

    return {
      featurecollection,
      centerPosition,
      variableFertilizationMaps,
      addFeature,
      clearFeatureCollection,
      addViewVariableFertilizationMap,
      clearViewVariableFertilizationMap,
      removeVariableFertilizationMap,
    }
  },
  { persist: true },
)
