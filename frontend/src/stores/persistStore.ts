import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useStore } from './store'
import { area as turfArea } from '@turf/turf'

import type { FeatureCollection, Feature, Polygon } from 'geojson'
import type { VariableFertilizationMap } from '@/types/create-variable-fertilization'

export const usePersistStore = defineStore(
  'persistStore',
  () => {
    const maxFeatures: number = 10
    const store = useStore()
    const featurecollection = ref<
      FeatureCollection<
        Polygon,
        {
          id: string
          vfms: VariableFertilizationMap[]
          area_are: number
          memo?: string
        }
      >
    >({
      type: 'FeatureCollection',
      features: [],
    })
    const centerPosition = ref({ lng: 142.5, lat: 43.5, zoom: 7 })

    const variableFertilizationMaps = ref<VariableFertilizationMap[]>([])

    const vfm_count = computed(() => {
      let vfm_count = 0
      featurecollection.value.features.map((f) => {
        vfm_count += f.properties.vfms.length
      })

      return vfm_count
    })

    const addFeature = (feature: Feature<Polygon>, memo: string = '') => {
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

      const newFeature = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: geometryCoordinates,
        },
        properties: { id: id, vfms: [], area_are: 0, memo: memo },
      }

      const area = Math.round(turfArea(newFeature) / 100)
      newFeature.properties.area_are = area

      if (featurecollection.value.features.length < maxFeatures) {
        featurecollection.value.features.push(newFeature)

        store.setMessage('Info', 'ポリゴンを登録しました')
      } else {
        store.setMessage('Error', `ポリゴン登録上限（${maxFeatures}筆）に達してます`)
      }
    }

    const addVfm = (id: string, vfms: VariableFertilizationMap) => {
      const maxFeatures = 5 //上書き！！

      if (vfm_count.value >= maxFeatures) {
        store.setMessage('Error', `可変施肥マップ登録上限（${maxFeatures}筆）に達してます`)
        return 'error'
      } else {
        featurecollection.value.features.map((f) => {
          if (f.properties.id === id) {
            f.properties.vfms.push(vfms)
            store.setMessage('Info', '可変施肥マップを登録しました')
          }
        })
        return 'success'
      }
    }

    const addVariableFertilizationMap = (
      features: Feature<Polygon>[],
      activeFeatureId: string,
      totalAmount: number,
      area: number,
    ) => {
      variableFertilizationMaps.value.push({
        vfm: {
          type: 'FeatureCollection',
          features: features,
        },
        id: activeFeatureId,
        created_at: new Date().toISOString(),
        amount_10a: 0,
        total_amount: totalAmount,
        area: area,
        fertilization_range: 0,
        memo: '',
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
      vfm_count,
      addFeature,
      addVfm,
      clearFeatureCollection,
      addVariableFertilizationMap,
      deleteVariableFertilizationMaps,
      removeVariableFertilizationMap,
    }
  },
  { persist: true },
)
