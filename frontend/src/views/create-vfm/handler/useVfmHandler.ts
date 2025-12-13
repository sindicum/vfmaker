import { ref, computed, watch } from 'vue'

import { updateVrf } from './services/vfmServices'

import { useConfigPersistStore } from '@/stores/configPersistStore'

import type { FeatureCollection } from 'geojson'
import type { GeoJSONSource } from 'maplibre-gl'
import type { MapLibreMapRef } from '@/types/map.type'
import type { VfmapFeature } from '@/types/vfm.type'

/**
 * @param map
 * @returns baseFertilizationAmount,
 * @returns variableFertilizationRangeRate,
 * @returns applicationGridFeatureCollection,
 * @returns getVfm,
 */

export function useVfmHandler(map: MapLibreMapRef) {
  const baseFertilizationAmount = ref<number>(100)
  const variableFertilizationRangeRate = ref<number>(20)
  const applicationGridFeatureCollection = ref<FeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  })

  const vfmapFeatures = ref<VfmapFeature[]>([])

  const configPersistStore = useConfigPersistStore()

  // 可変施肥増減率を5段階で算出（max -> min の順）
  const applicationStep = computed<[number, number, number, number, number]>(() => {
    const rangeMax = variableFertilizationRangeRate.value / 100
    const rangeMid = 0
    const rangeMin = (variableFertilizationRangeRate.value / 100) * -1
    const rangeMaxMid = rangeMax / 2
    const rangeMinMid = rangeMin / 2
    return [rangeMax, rangeMaxMid, rangeMid, rangeMinMid, rangeMin]
  })

  let timeoutId: number | null = null

  const totalArea = ref(0)
  const totalAmount = ref(0)

  // Step3で設定する、基準施肥量、可変施肥増減率を監視
  watch([variableFertilizationRangeRate, baseFertilizationAmount], () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      const { updatedVfmapFeatures, areaSum, amountSum } = updateVrf(
        vfmapFeatures.value,
        configPersistStore.fiveStepsFertilization,
        applicationStep.value,
        baseFertilizationAmount.value,
        configPersistStore.missingHumusDataInterpolation,
      )

      totalArea.value = areaSum
      totalAmount.value = amountSum
      const sourceData = map?.value?.getSource('vra-map-default') as GeoJSONSource
      applicationGridFeatureCollection.value.features = updatedVfmapFeatures
      if (!sourceData) return
      sourceData.setData(applicationGridFeatureCollection.value)
    }, 300)
  })

  return {
    baseFertilizationAmount,
    variableFertilizationRangeRate,
    vfmapFeatures,
    applicationStep,
    totalArea,
    totalAmount,
  }
}
