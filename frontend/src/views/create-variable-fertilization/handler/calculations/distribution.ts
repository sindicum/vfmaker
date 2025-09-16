// 腐植値に応じた施肥量加減割合のMapオブジェクトを生成
export function distributeFertilizerRateSteps(
  humusMeanAreaMap: Map<number, number>,
  fertilizationFactorArray: number[],
): Map<number, number> {
  const result = new Map<number, number>()

  // 空のMapチェック
  if (humusMeanAreaMap.size === 0) {
    result.set(0, -1)
    return result
  }

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

  // 全ての腐植値が0の場合
  if (newHumusMeanArray.length === 0) {
    result.set(0, -1)
    return result
  }

  const applicationRatioArray = redistributeFactor(newAreaArray, fertilizationFactorArray)

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
export function distributeFertilizerRateStepless(
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
export function redistributeFactor(
  areaArray: number[],
  fertilizationFactorArray: number[],
): number[] {
  // 空配列チェック
  if (areaArray.length === 0 || fertilizationFactorArray.length === 0) {
    return []
  }

  const fertilizationFactorIntervalRate = 1 / fertilizationFactorArray.length
  const totalArea = areaArray.reduce((sum, el) => sum + el, 0) // 初期値0を追加
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
