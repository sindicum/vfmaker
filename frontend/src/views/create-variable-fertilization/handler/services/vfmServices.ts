import type { Feature, Polygon } from 'geojson'
import type { BaseGrid, HumusPoints, ApplicationGridFeatures } from '@/types/geom'
import { getHumusMeanFeatures } from '../calculations/humus'

import { distributeFertilizerRateSteps } from '../calculations/distribution'
import { distributeFertilizerRateStepless } from '../calculations/distribution'

export function createVfm(
  activeFeature: Feature<Polygon, { id: string }>,
  baseGrid: BaseGrid,
  humusPoints: HumusPoints,
  fiveStepsFertilization: boolean,
  applicationStep: [number, number, number, number, number],
  baseFertilizationAmount: number,
  missingHumusDataInterpolation: boolean,
) {
  const humusMeanFeatures = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)
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
    humusMeanFertilizerRateMap = distributeFertilizerRateSteps(humusMeanAreaMap, applicationStep)
  } else {
    const rangeMax = applicationStep[0]
    humusMeanFertilizerRateMap = distributeFertilizerRateStepless(humusMeanAreaMap, rangeMax)
  }
  // 面積合計と施肥量合計を初期化
  let areaSum = 0
  let amountSum = 0
  sortedFeatures.forEach((v) => {
    if (v.properties === null) return
    const humusMean = v.properties.humus_mean
    const area = v.properties.area

    const amountFertilizationFactor = humusMeanFertilizerRateMap.get(humusMean) ?? 0

    // 施肥量がマイナスの場合は0にする
    const unit = Math.max(0, Math.round(baseFertilizationAmount * (1 + amountFertilizationFactor)))
    const missingHumusData = amountFertilizationFactor === -1 && v.properties.intersects

    if (missingHumusDataInterpolation && missingHumusData) {
      v.properties.amount_fertilization_factor = 0
      v.properties.amount_fertilization_unit = baseFertilizationAmount

      areaSum += area
      amountSum += (baseFertilizationAmount * area) / 1000
    } else {
      v.properties.amount_fertilization_factor = amountFertilizationFactor
      v.properties.amount_fertilization_unit = unit

      areaSum += unit !== 0 ? area : 0
      amountSum += (unit * area) / 1000
    }
  })
  return { sortedFeatures, areaSum, amountSum }
}

// VrfMapの再作成
export function updateVrf(
  applicationGrid: ApplicationGridFeatures,
  fiveStepsFertilization: boolean,
  applicationStep: [number, number, number, number, number],
  baseFertilizationAmount: number,
  missingHumusDataInterpolation: boolean,
) {
  applicationGrid.sort((m, n) => m.properties.humus_mean - n.properties.humus_mean)

  // キー:腐植値、値:面積合計
  const humusMeanAreaMap = new Map<number, number>()

  // 各腐植値をキーとした累計面積のMapオブジェクトを生成
  applicationGrid?.map((el) => {
    const getHumusMean = humusMeanAreaMap.get(el.properties.humus_mean)

    if (getHumusMean !== undefined) {
      // if (humusMeanAreaMap.has(el.properties.humus_mean)) {
      humusMeanAreaMap.set(el.properties.humus_mean, getHumusMean + el.properties.area)
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

  // 面積合計と施肥量合計を初期化
  let areaSum = 0
  let amountSum = 0
  applicationGrid.map((v) => {
    if (v.properties === null) return

    const humusMean = v.properties.humus_mean
    const area = v.properties.area

    const amountFertilizationFactor = humusMeanFertilizerRateMap.get(humusMean) ?? 0

    // 施肥量がマイナスの場合は0にする
    const unit = Math.max(0, Math.round(baseFertilizationAmount * (1 + amountFertilizationFactor)))

    const missingHumusData = amountFertilizationFactor === -1 && v.properties.intersects

    if (missingHumusDataInterpolation && missingHumusData) {
      v.properties.amount_fertilization_factor = 0
      v.properties.amount_fertilization_unit = baseFertilizationAmount

      areaSum += area
      amountSum += (baseFertilizationAmount * area) / 1000
    } else {
      v.properties.amount_fertilization_factor = amountFertilizationFactor
      v.properties.amount_fertilization_unit = unit

      areaSum += unit !== 0 ? area : 0
      amountSum += (unit * area) / 1000
    }
  })

  return { applicationGrid, areaSum, amountSum }
}
