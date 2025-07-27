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
        store.setMessage('Error', 'ポリゴンIDが設定されていません')
        return
      }
      const id = String(feature.id)
      const geometryType = feature.geometry.type
      const geometryCoordinates = feature.geometry.coordinates

      if (geometryType !== 'Polygon') {
        store.setMessage('Error', 'Polygon以外の登録はできません（MultiPolygonは未対応）')
        return
      }

      if (featurecollection.value.features.length < maxFeatures) {
        featurecollection.value.features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: geometryCoordinates,
          },
          properties: { id: id },
        })
        store.setMessage('Info', 'ポリゴンを登録しました')
      } else {
        store.setMessage('Error', `ポリゴン登録上限（${maxFeatures}筆）に達してます`)
      }
    }

    const addVariableFertilizationMap = (
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

    const deleteVariableFertilizationMaps = () => {
      variableFertilizationMaps.value = []
    }

    const removeVariableFertilizationMap = (id: string) => {
      const index = variableFertilizationMaps.value.findIndex((vfm) => vfm.id === id)
      if (index !== -1) {
        variableFertilizationMaps.value.splice(index, 1)
      }
    }

    return {
      maxFeatures,
      featurecollection,
      centerPosition,
      variableFertilizationMaps,
      addFeature,
      clearFeatureCollection,
      addVariableFertilizationMap,
      deleteVariableFertilizationMaps,
      removeVariableFertilizationMap,
    }
  },
  { persist: true },
)
