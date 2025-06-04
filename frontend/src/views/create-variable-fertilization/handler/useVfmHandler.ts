import { ref, computed, watch } from 'vue'

import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf'
import type { GeoJSONSource } from 'maplibre-gl'
import geojsonRbush from '@turf/geojson-rbush'
import { addVraMap } from './LayerHandler'

import type { FeatureCollection, Feature, Polygon, Point } from 'geojson'
import type { MaplibreRef } from '@/types/maplibre'
import type { BaseGrid, HumusPoints, ApplicationGridFeatures } from '@/types/geom'

/**
 * @param map
 * @returns baseFertilizationAmount,
 * @returns variableFertilizationRangeRate,
 * @returns applicationGridFeatureCollection,
 * @returns getVfm,
 */

export function useVfmHandler(map: MaplibreRef) {
  const baseFertilizationAmount = ref(100)
  const variableFertilizationRangeRate = ref(20)
  const applicationGridFeatureCollection = ref<FeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  })

  const applicationGridFeatures = ref<ApplicationGridFeatures>([])

  // 可変施肥増減率を5段階で算出
  const applicationStep = computed<[number, number, number, number, number]>(() => {
    const range0 = variableFertilizationRangeRate.value / 100
    const range2 = 0
    const range4 = (variableFertilizationRangeRate.value / 100) * -1
    const range1 = range0 / 2
    const range3 = range4 / 2
    return [range0, range1, range2, range3, range4]
  })

  let timeoutId: number | null = null

  const totalAmount = ref(0)

  // Step3で設定する、基準施肥量、可変施肥増減率を監視
  watch([variableFertilizationRangeRate, baseFertilizationAmount], () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      const vrf = updateVrf(
        applicationGridFeatures.value,
        applicationStep.value,
        baseFertilizationAmount.value,
      )

      const sourceData = map?.value?.getSource('vra-map') as GeoJSONSource
      applicationGridFeatureCollection.value.features = vrf
      if (!sourceData) return
      sourceData.setData(applicationGridFeatureCollection.value)
    }, 300)
  })

  // グリッドと腐植ポイントから可変施肥メッシュを作成
  function createVfm(baseGrid: BaseGrid, humusPoints: HumusPoints) {
    const humusMeanFeatures = getHumusMeanFeatures(baseGrid, humusPoints)

    // humusMeanFeaturesに対して、humus_meanの数値に基づきソート
    const sortedFeatures = humusMeanFeatures
      .filter((m) => m.properties !== null && typeof m.properties.humus_mean === 'number')
      .sort((m, n) => m.properties!.humus_mean - n.properties!.humus_mean)

    // キー:腐植値、値:面積合計
    const humusMeanAreaMap = new Map<number, number>()

    // 各腐植値をキーとした累計面積のMapオブジェクトを生成
    sortedFeatures.forEach((el) => {
      if (el.properties === null) return

      const humusMean = el.properties.humus_mean
      const area = el.properties.area

      humusMeanAreaMap.set(humusMean, (humusMeanAreaMap.get(humusMean) ?? 0) + area)
    })

    // 腐植値に応じた施肥量加減割合のMapオブジェクトを生成
    const humusMeanFertilizerRateMap = distributeFertilizerRate(
      humusMeanAreaMap,
      applicationStep.value,
    )
    totalAmount.value = 0
    sortedFeatures.forEach((v) => {
      if (v.properties === null) return

      const humusMean = v.properties.humus_mean
      const amountFertilizationFactor = humusMeanFertilizerRateMap.get(humusMean) ?? 0

      const unit = Math.round(baseFertilizationAmount.value * (1 + amountFertilizationFactor))
      const area = v.properties.area
      v.properties.amount_fertilization_factor = amountFertilizationFactor
      v.properties.amount_fertilization_unit = unit
      totalAmount.value += (unit * area) / 1000
    })
    applicationGridFeatures.value = sortedFeatures
    // VraMapを表示
    if (!map?.value) return
    addVraMap(
      map.value,
      { type: 'FeatureCollection', features: applicationGridFeatures.value },
      applicationStep.value,
    )
  }

  // VrfMapの再作成
  function updateVrf(
    applicationGrid: ApplicationGridFeatures,
    applicationStep: [number, number, number, number, number],
    fertilizationAmount: number,
  ) {
    applicationGrid.sort((m, n) => m.properties.humus_mean - n.properties.humus_mean)
    const humusMeanAreaMap = new Map()
    applicationGrid?.map((el) => {
      if (humusMeanAreaMap.has(el.properties.humus_mean)) {
        humusMeanAreaMap.set(
          el.properties.humus_mean,
          humusMeanAreaMap.get(el.properties.humus_mean) + el.properties.area,
        )
      } else {
        humusMeanAreaMap.set(el.properties.humus_mean, el.properties.area)
      }
    })

    const humusMeanFertilizerRateMap = distributeFertilizerRate(humusMeanAreaMap, applicationStep)

    totalAmount.value = 0
    applicationGrid.map((v) => {
      if (v.properties === null) return

      const humusMean = v.properties.humus_mean
      const amountFertilizationFactor = humusMeanFertilizerRateMap.get(humusMean) ?? 0

      v.properties.amount_fertilization_factor = amountFertilizationFactor
      const unit = Math.round(fertilizationAmount * (1 + amountFertilizationFactor))
      const area = v.properties.area
      v.properties.amount_fertilization_unit = unit
      // v.properties.amount_fertilization_total = Math.round((unit * area) / 100)
      totalAmount.value += (unit * area) / 1000
    })

    return applicationGrid
  }

  // グリッド内に含まれる腐植ポイントの平均値を算出
  function getHumusMeanFeatures(
    baseGrid: BaseGrid,
    humusPoints: HumusPoints,
  ): ApplicationGridFeatures {
    // 生成配列の初期化
    const humusMeanFeatures: ApplicationGridFeatures = []

    const polygons = baseGrid
    const points = humusPoints
    // インデックス作成（ポイントに対して）
    const index = geojsonRbush<Point>()
    index.load(points) // ポイント集合をインデックスに登録

    for (let i = 0; i < polygons.features.length; i++) {
      // ポリゴンのbboxで検索
      const candidates = index.search(polygons.features[i])
      // bbox一致だけなので、正確な判定は booleanPointInPolygonで行う。
      const contained = candidates.features.filter(
        (point): point is Feature<Point, { humus: number }> =>
          turfBooleanPointInPolygon(point, polygons.features[i]),
      )
      // 初期値設定（ポリゴンに含有するポイントFeatureが無い場合は初期値のまま）
      let mean = 0
      if (contained.length > 0) {
        // 各Featureのproperties.humusを合計し平均を算出
        const sum = contained.reduce((humusSum, feature) => humusSum + feature.properties.humus, 0)
        mean = sum / contained.length
      }

      const meshFeature: Feature<Polygon, { humus_mean: number; area: number }> = {
        type: 'Feature',
        geometry: polygons.features[i].geometry,
        properties: {
          humus_mean: mean,
          area: polygons.features[i].properties.area,
        },
      }
      humusMeanFeatures.push(meshFeature)
    }

    return humusMeanFeatures
  }

  // 腐植値に応じた施肥量加減割合のMapオブジェクトを生成
  function distributeFertilizerRate(
    humusMeanAreaMap: Map<number, number>,
    fertilizationFactorArray: number[],
  ): Map<number, number> {
    const humusMeanArray = Array.from(humusMeanAreaMap.keys())
    const areaArray = Array.from(humusMeanAreaMap.values())
    const newHumusMeanArray = []
    const newAreaArray = []

    for (let i = 0; i < humusMeanArray.length; i++) {
      if (humusMeanArray[i] !== 0) {
        newHumusMeanArray.push(humusMeanArray[i])
        newAreaArray.push(areaArray[i])
      }
    }

    const applicationRatioArray = redistributeFactor(areaArray, fertilizationFactorArray)

    const fertilizationRate = new Map(
      newHumusMeanArray.map((value, index) => [value, applicationRatioArray[index]]),
    )
    fertilizationRate.set(0, -1)
    return fertilizationRate
  }

  // 各グリッドの可変施肥量率を設定した配列を生成
  function redistributeFactor(areaArray: number[], fertilizationFactorArray: number[]): number[] {
    const fertilizationFactorIntervalRate = 1 / fertilizationFactorArray.length
    const totalArea = areaArray.reduce((sum, el) => sum + el)
    let intervalRate = fertilizationFactorIntervalRate
    const applicationRatioArray = []
    let fertilizationFactorArrayIndex = 0
    let rateOfAreas = 0
    let cumulativeRateOfAreas = 0
    let areaRateForFertilizationFactor = 0

    for (let areaArrayIndex = 0; areaArrayIndex < areaArray.length; areaArrayIndex++) {
      rateOfAreas = areaArray[areaArrayIndex] / totalArea
      if (areaArrayIndex !== areaArray.length - 1) {
        cumulativeRateOfAreas = cumulativeRateOfAreas + rateOfAreas
      } else {
        cumulativeRateOfAreas = 1
      }

      if (cumulativeRateOfAreas <= intervalRate) {
        areaRateForFertilizationFactor += rateOfAreas
        applicationRatioArray.push(fertilizationFactorArray[fertilizationFactorArrayIndex])
      } else {
        let applicationRatio = 0

        while (cumulativeRateOfAreas > intervalRate) {
          applicationRatio =
            applicationRatio +
            (fertilizationFactorArray[fertilizationFactorArrayIndex] *
              (intervalRate - areaRateForFertilizationFactor)) /
              rateOfAreas
          areaRateForFertilizationFactor = intervalRate
          fertilizationFactorArrayIndex++
          intervalRate = intervalRate + fertilizationFactorIntervalRate
        }
        applicationRatio =
          applicationRatio +
          (fertilizationFactorArray[fertilizationFactorArrayIndex] *
            (cumulativeRateOfAreas - areaRateForFertilizationFactor)) /
            rateOfAreas
        areaRateForFertilizationFactor = cumulativeRateOfAreas

        applicationRatioArray.push(applicationRatio)
      }
    }
    return applicationRatioArray
  }

  return {
    baseFertilizationAmount,
    variableFertilizationRangeRate,
    applicationGridFeatures,
    totalAmount,
    createVfm,
  }
}
