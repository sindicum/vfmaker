import { ref, computed, watch } from 'vue'

import {
  booleanPointInPolygon as turfBooleanPointInPolygon,
  centroid as turfCentroid,
  distance as turfDistance,
} from '@turf/turf'
import type { GeoJSONSource } from 'maplibre-gl'
import geojsonRbush from '@turf/geojson-rbush'
import { addVraMap } from './LayerHandler'
import { useConfigPersistStore } from '@/stores/configPersistStore'

import { useErrorHandler } from '@/composables/useErrorHandler'
import { createGeospatialError } from '@/utils/errorFactories'

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
  const { handleError } = useErrorHandler()

  const baseFertilizationAmount = ref(100)
  const variableFertilizationRangeRate = ref(20)
  const applicationGridFeatureCollection = ref<FeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  })

  const applicationGridFeatures = ref<ApplicationGridFeatures>([])

  const configPersistStore = useConfigPersistStore()

  // 可変施肥増減率を5段階で算出（max -> min の順）
  const applicationStep = computed<[number, number, number, number, number]>(() => {
    // 可変施肥増減率が0または100の場合は1または99に変換（applicationStepの値に差を設けるため）
    let effectiveRate
    if (variableFertilizationRangeRate.value === 0) {
      effectiveRate = 1
    } else if (variableFertilizationRangeRate.value === 100) {
      effectiveRate = 99
    } else {
      effectiveRate = variableFertilizationRangeRate.value
    }
    const rangeMax = effectiveRate / 100
    const rangeMid = 0
    const rangeMin = (effectiveRate / 100) * -1
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
      const vrf = updateVrf(
        applicationGridFeatures.value,
        applicationStep.value,
        baseFertilizationAmount.value,
        configPersistStore.fiveStepsFertilization,
      )

      const sourceData = map?.value?.getSource('vra-map') as GeoJSONSource
      applicationGridFeatureCollection.value.features = vrf
      if (!sourceData) return
      sourceData.setData(applicationGridFeatureCollection.value)
    }, 300)
  })

  // グリッドと腐植ポイントから可変施肥メッシュを作成
  function createVfm(
    baseGrid: BaseGrid,
    humusPoints: HumusPoints,
    fiveStepsFertilization: boolean,
  ) {
    try {
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
      let humusMeanFertilizerRateMap
      if (fiveStepsFertilization) {
        humusMeanFertilizerRateMap = distributeFertilizerRateSteps(
          humusMeanAreaMap,
          applicationStep.value,
        )
      } else {
        const rangeMax = applicationStep.value[0]
        humusMeanFertilizerRateMap = distributeFertilizerRateStepless(humusMeanAreaMap, rangeMax)
      }
      totalArea.value = 0
      totalAmount.value = 0
      sortedFeatures.forEach((v) => {
        if (v.properties === null) return

        const humusMean = v.properties.humus_mean
        const amountFertilizationFactor = humusMeanFertilizerRateMap.get(humusMean) ?? 0

        // 施肥量がマイナスの場合は0にする
        const unit = Math.max(
          0,
          Math.round(baseFertilizationAmount.value * (1 + amountFertilizationFactor)),
        )
        const area = v.properties.area
        v.properties.amount_fertilization_factor = amountFertilizationFactor
        v.properties.amount_fertilization_unit = unit
        if (unit !== 0) {
          totalArea.value += area
        }
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
    } catch (error) {
      handleError(
        createGeospatialError('createVfm', error as Error, {
          gridCount: baseGrid.features.length,
          pointCount: humusPoints.features.length,
        }),
      )
    }
  }

  // VrfMapの再作成
  function updateVrf(
    applicationGrid: ApplicationGridFeatures,
    applicationStep: [number, number, number, number, number],
    fertilizationAmount: number,
    fiveStepsFertilization: boolean,
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

    // 腐植値に応じた施肥量加減割合のMapオブジェクトを生成
    let humusMeanFertilizerRateMap
    if (fiveStepsFertilization) {
      humusMeanFertilizerRateMap = distributeFertilizerRateSteps(humusMeanAreaMap, applicationStep)
    } else {
      const rangeMax = applicationStep[0]
      humusMeanFertilizerRateMap = distributeFertilizerRateStepless(humusMeanAreaMap, rangeMax)
    }

    totalAmount.value = 0
    totalArea.value = 0
    applicationGrid.map((v) => {
      if (v.properties === null) return

      const humusMean = v.properties.humus_mean
      const amountFertilizationFactor = humusMeanFertilizerRateMap.get(humusMean) ?? 0

      // 施肥量がマイナスの場合は0にする
      const unit = Math.max(0, Math.round(fertilizationAmount * (1 + amountFertilizationFactor)))
      const area = v.properties.area
      v.properties.amount_fertilization_factor = amountFertilizationFactor
      v.properties.amount_fertilization_unit = unit
      if (unit !== 0) {
        totalArea.value += area
      }
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

    // デバッグ用カウンター
    // let interpolatedMeshCount = 0

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
        // 各Featureのproperties.humusを合計し平均を算出（0の腐植値は除外）
        const validContained = contained.filter((feature) => feature.properties.humus !== 0)
        const sum = validContained.reduce(
          (humusSum, feature) => humusSum + feature.properties.humus,
          0,
        )
        mean = validContained.length > 0 ? sum / validContained.length : 0
      } else if (contained.length === 0) {
        // メッシュ内にポイントがない場合、近隣から探索
        const meshCentroid = turfCentroid(polygons.features[i])
        const searchRadiusKm = 0.0071 // 7.1m をkm単位で表現（5m*1.414=7.1m）

        const lat = meshCentroid.geometry.coordinates[1]
        const latRad = (lat * Math.PI) / 180
        const lonDegreePerKm = 1 / (111.32 * Math.cos(latRad))

        const expandedBbox = [
          meshCentroid.geometry.coordinates[0] - searchRadiusKm * lonDegreePerKm, // 経度方向の動的計算
          meshCentroid.geometry.coordinates[1] - searchRadiusKm / 111, // 緯度方向の概算
          meshCentroid.geometry.coordinates[0] + searchRadiusKm * lonDegreePerKm,
          meshCentroid.geometry.coordinates[1] + searchRadiusKm / 111,
        ] as [number, number, number, number]

        const nearbyPoints = index.search({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [expandedBbox[0], expandedBbox[1]],
                [expandedBbox[2], expandedBbox[1]],
                [expandedBbox[2], expandedBbox[3]],
                [expandedBbox[0], expandedBbox[3]],
                [expandedBbox[0], expandedBbox[1]],
              ],
            ],
          },
          properties: {},
        })

        // 最も近い有効なポイントを探す
        let minDistance = Infinity
        let nearestPoint: Feature<Point, { humus: number }> | null = null

        for (const point of nearbyPoints.features) {
          if (
            point.properties &&
            typeof point.properties.humus === 'number' &&
            point.properties.humus !== 0
          ) {
            const dist = turfDistance(meshCentroid, point, { units: 'kilometers' })
            if (dist <= searchRadiusKm && dist < minDistance) {
              minDistance = dist
              nearestPoint = point as Feature<Point, { humus: number }>
            }
          }
        }

        if (nearestPoint) {
          mean = nearestPoint.properties.humus
          // interpolatedMeshCount++
        }
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

    // デバッグ情報を出力
    // if (interpolatedMeshCount > 0) {
    //   console.log(
    //     `極小メッシュの補間処理: ${interpolatedMeshCount}個のメッシュで近隣ポイントから腐植値を取得しました`,
    //   )
    // }

    return humusMeanFeatures
  }

  // 腐植値に応じた施肥量加減割合のMapオブジェクトを生成
  function distributeFertilizerRateSteps(
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

  /**
   * 腐植値-面積マップから値距離ベースの重みを計算
   * @param humusMeanAreaMap キー:腐植値、値:面積合計のMap
   * @param maxRange 重みの最大範囲
   * @returns キー:腐植値、値:重み のMap
   */
  function distributeFertilizerRateStepless(
    humusMeanAreaMap: Map<number, number>,
    maxRange: number,
  ): Map<number, number> {
    const result = new Map<number, number>()
    // 腐植値（キー）を取得し、0を除外して昇順に並べ替え
    const humusValues = Array.from(humusMeanAreaMap.keys())
    const sorted = humusValues.filter((v) => v !== 0).sort((a, b) => a - b)
    const n = sorted.length

    if (n === 0) {
      // 0のみの場合
      if (humusValues.includes(0)) {
        result.set(0, -1)
      }
      return result
    }

    if (n === 1) {
      // 腐植値が1つしかない場合は重み0
      result.set(sorted[0], 0)
      if (humusValues.includes(0)) {
        result.set(0, -1)
      }
      return result
    }

    const minVal = sorted[0]
    const maxVal = sorted[n - 1]
    const range = maxVal - minVal

    // Step 1: 値の距離ベースで基本重みを計算
    const baseWeights: number[] = []
    const areas: number[] = []

    sorted.forEach((humusValue) => {
      const ratio = (humusValue - minVal) / range // 0 ～ 1
      const weight = maxRange - 2 * maxRange * ratio //  maxRange ～ -maxRange
      baseWeights.push(weight)
      areas.push(humusMeanAreaMap.get(humusValue)!)
    })

    // Step 2: 総面積を計算
    const totalArea = areas.reduce((sum, area) => sum + area, 0)

    // Step 3: 面積加重平均を計算
    let weightedSum = 0
    for (let i = 0; i < n; i++) {
      weightedSum += baseWeights[i] * (areas[i] / totalArea)
    }

    // Step 4: 面積加重平均を引いて調整
    const adjustedWeights = baseWeights.map((w) => w - weightedSum)

    // Step 5: 結果をMapに格納
    sorted.forEach((humusValue, idx) => {
      result.set(humusValue, Number(adjustedWeights[idx].toFixed(10)))
    })

    // 0の腐植値がある場合は除外値として-1を設定
    if (humusValues.includes(0)) {
      result.set(0, -1)
    }

    return result
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
    totalArea,
    totalAmount,
    createVfm,
    // テスト用にエクスポート
    distributeFertilizerRateSteps,
    distributeFertilizerRateStepless,
  }
}
