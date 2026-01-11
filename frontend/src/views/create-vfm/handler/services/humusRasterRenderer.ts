import { bbox as turfBbox, booleanPointInPolygon as turfBooleanPointInPolygon, point as turfPoint } from '@turf/turf'

import type { Feature, Polygon } from 'geojson'
import type { ReadRasterResult } from 'geotiff'

/**
 * 腐植値に基づいてRGB色を返す
 * カラースケール: 赤(0) → 黄(75) → 緑(100) → 青(150+)
 * @param humus 腐植含有量 (mg/kg)
 * @returns [R, G, B] の配列
 */
export function getColorForHumus(humus: number): [number, number, number] {
  if (humus <= 0) return [215, 25, 28] // #d7191c
  if (humus <= 25) {
    const t = humus / 25
    return [
      Math.round(215 + (240 - 215) * t),
      Math.round(25 + (124 - 25) * t),
      Math.round(28 + (74 - 28) * t),
    ]
  }
  if (humus <= 50) {
    const t = (humus - 25) / 25
    return [
      Math.round(240 + (254 - 240) * t),
      Math.round(124 + (201 - 124) * t),
      Math.round(74 + (128 - 74) * t),
    ]
  }
  if (humus <= 75) {
    const t = (humus - 50) / 25
    return [
      Math.round(254 + (255 - 254) * t),
      Math.round(201 + (255 - 201) * t),
      Math.round(128 + (191 - 128) * t),
    ]
  }
  if (humus <= 100) {
    const t = (humus - 75) / 25
    return [
      Math.round(255 + (199 - 255) * t),
      Math.round(255 + (232 - 255) * t),
      Math.round(191 + (173 - 191) * t),
    ]
  }
  if (humus <= 125) {
    const t = (humus - 100) / 25
    return [
      Math.round(199 + (128 - 199) * t),
      Math.round(232 + (191 - 232) * t),
      Math.round(173 + (171 - 173) * t),
    ]
  }
  if (humus <= 150) {
    const t = (humus - 125) / 25
    return [
      Math.round(128 + (43 - 128) * t),
      Math.round(191 + (131 - 191) * t),
      Math.round(171 + (186 - 171) * t),
    ]
  }
  return [43, 131, 186] // #2b83ba
}

/**
 * COGデータからラスター画像（Canvas）を生成
 * ポリゴン外の領域は透明になる
 * @param cogSource COGから取得したラスターデータ
 * @param polygon クリップ用のポリゴン
 * @returns HTMLCanvasElement
 */
export function createHumusRasterImage(
  cogSource: ReadRasterResult,
  polygon: Feature<Polygon>,
): HTMLCanvasElement {
  const bbox4326 = turfBbox(polygon)

  // キャンバスを作成
  const canvas = document.createElement('canvas')
  canvas.width = cogSource.width
  canvas.height = cogSource.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context creation failed')
  }

  // ImageDataを作成
  const imageData = ctx.createImageData(cogSource.width, cogSource.height)
  const data = imageData.data

  // バウンディングボックスの範囲を取得
  const bboxMinLng = bbox4326[0]
  const bboxMinLat = bbox4326[1]
  const bboxMaxLng = bbox4326[2]
  const bboxMaxLat = bbox4326[3]

  // COGデータをImageDataに変換
  let cogSourcePosition = 0
  for (let y = 0; y < cogSource.height; y++) {
    for (let x = 0; x < cogSource.width; x++) {
      // ピクセルの地理座標を計算
      const lng = bboxMinLng + (x / (cogSource.width - 1)) * (bboxMaxLng - bboxMinLng)
      const lat = bboxMaxLat - (y / (cogSource.height - 1)) * (bboxMaxLat - bboxMinLat)

      // ポイントがポリゴン内にあるかチェック
      const pointFeature = turfPoint([lng, lat])
      const isInsidePolygon = turfBooleanPointInPolygon(pointFeature, polygon)

      const pixelIndex = (y * cogSource.width + x) * 4

      if (isInsidePolygon) {
        // ポリゴン内の場合は腐植値に基づいて色を設定
        const humus = Number(cogSource[cogSourcePosition] ?? 0)
        const [r, g, b] = getColorForHumus(humus)
        // 腐植値が0の場合は透明にする
        const opacity = humus === 0 ? 0 : 1

        data[pixelIndex] = r
        data[pixelIndex + 1] = g
        data[pixelIndex + 2] = b
        data[pixelIndex + 3] = 255 * opacity
      } else {
        // ポリゴン外の場合は完全に透明
        data[pixelIndex] = 0
        data[pixelIndex + 1] = 0
        data[pixelIndex + 2] = 0
        data[pixelIndex + 3] = 0
      }

      cogSourcePosition++
    }
  }

  // ImageDataをキャンバスに描画
  ctx.putImageData(imageData, 0, 0)

  return canvas
}
