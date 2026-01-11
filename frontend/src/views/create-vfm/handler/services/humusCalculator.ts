import type { FeatureCollection, Point } from 'geojson'
import type { ReadRasterResult } from 'geotiff'
import type { HumusPointFeatureCollection } from '@/types/vfm.type'

export type HumusStats = { mean: number; stdDev: number }

export type HumusStatsResult =
  | { ok: true; stats: HumusStats }
  | { ok: false; reason: 'NO_VALID_VALUES' | 'NOT_FINITE' }

type NumericArrayLike = ArrayLike<number>

/**
 * TypedArrayかどうかを判定
 */
function isNumericArrayLike(x: unknown): x is NumericArrayLike {
  return ArrayBuffer.isView(x) && !(x instanceof DataView)
}

/**
 * ReadRasterResultから数値配列を抽出
 */
export function toNumericValues(input: ReadRasterResult): NumericArrayLike | null {
  // バンド配列なら先頭を使う（samples:[0]なら通常これでOK）
  if (Array.isArray(input)) {
    const band0 = input[0]
    return isNumericArrayLike(band0) ? (band0 as NumericArrayLike) : null
  }
  // 単一バンド（TypedArray & Dimensions など）
  return isNumericArrayLike(input) ? (input as NumericArrayLike) : null
}

/**
 * 腐植含有量の平均値と標準偏差を計算
 * @param values COGから取得したラスターデータ
 * @returns 計算結果またはエラー
 */
export function calculateHumusStats(values: ReadRasterResult): HumusStatsResult {
  const arr = toNumericValues(values)
  if (!arr || arr.length === 0) {
    return { ok: false, reason: 'NO_VALID_VALUES' }
  }

  let count = 0
  let sum = 0
  let sumSq = 0

  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v === 0 || !Number.isFinite(v)) continue
    count++
    sum += v
    sumSq += v * v
  }

  if (count === 0) {
    return { ok: false, reason: 'NO_VALID_VALUES' }
  }

  const mean = sum / count
  const variance = sumSq / count - mean * mean

  if (!Number.isFinite(mean) || variance < 0) {
    return { ok: false, reason: 'NOT_FINITE' }
  }

  const stdDev = Math.sqrt(variance)

  if (!Number.isFinite(stdDev)) {
    return { ok: false, reason: 'NOT_FINITE' }
  }

  return {
    ok: true,
    stats: { mean: Math.round(mean), stdDev: Math.round(stdDev) },
  }
}

/**
 * COGデータからポイントグリッドを生成
 * @param bbox バウンディングボックス [minLng, minLat, maxLng, maxLat]
 * @param cogSource COGから取得したラスターデータ
 * @returns 腐植値を持つポイントのFeatureCollection
 */
export function getHumusPointGridBbox(
  bbox: [number, number, number, number],
  cogSource: ReadRasterResult,
): HumusPointFeatureCollection {
  const data = toNumericValues(cogSource)
  if (!data) throw new Error('Invalid raster data')

  const bboxMinLng = bbox[0]
  const bboxMinLat = bbox[1]
  const bboxMaxLng = bbox[2]
  const bboxMaxLat = bbox[3]
  let cogSourcePosition = 0
  const point_mesh_feature_collection = []

  const deltaLat = (bboxMaxLat - bboxMinLat) / cogSource.height
  const deltaLng = (bboxMaxLng - bboxMinLng) / cogSource.width

  for (let gridNS_cnt = 0; gridNS_cnt < cogSource.height; gridNS_cnt++) {
    const lat = bboxMaxLat - deltaLat * (gridNS_cnt + 0.5)

    for (let gridEW_cnt = 0; gridEW_cnt < cogSource.width; gridEW_cnt++) {
      const lng = bboxMinLng + deltaLng * (gridEW_cnt + 0.5)
      const humus = Number(cogSource[cogSourcePosition] ?? 0)

      point_mesh_feature_collection.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [lng, lat] as [number, number],
        },
        properties: { humus },
      })

      cogSourcePosition++
    }
  }

  const featureCollection: FeatureCollection<Point, { humus: number }> = {
    type: 'FeatureCollection',
    features: point_mesh_feature_collection,
  }
  return featureCollection
}
