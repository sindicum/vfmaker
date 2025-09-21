import {
  booleanDisjoint as turfBooleanDisjoint,
  booleanPointInPolygon as turfBooleanPointInPolygon,
  centroid as turfCentroid,
  distance as turfDistance,
} from '@turf/turf'
import geojsonRbush from '@turf/geojson-rbush'

import type {
  HumusPointFeatureCollection,
  BaseGridFeatureCollection,
  VfmapFeature,
  HumusPointFeature,
} from '@/types/vfm.type'
import type { FieldPolygonFeature } from '@/types/fieldpolygon.type'
import type { Point } from 'geojson'

// グリッド内に含まれる腐植ポイントの平均値を算出
export function getHumusMeanFeatures(
  activeFeature: FieldPolygonFeature,
  baseGrid: BaseGridFeatureCollection,
  humusPoints: HumusPointFeatureCollection,
): VfmapFeature[] {
  // 生成配列の初期化
  const vfmapFeatures = []

  const polygons = baseGrid
  const points = humusPoints
  // インデックス作成（ポイントに対して）
  const index = geojsonRbush<Point>()
  index.load(points) // ポイント集合をインデックスに登録

  for (let i = 0; i < polygons.features.length; i++) {
    // ポリゴンのbboxで検索
    const candidates = index.search(polygons.features[i])

    // bbox一致だけなので、正確な判定は booleanPointInPolygonで行う。
    const contained = candidates.features.filter((point): point is HumusPointFeature =>
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
      let nearestPoint: HumusPointFeature | null = null

      for (const point of nearbyPoints.features) {
        if (
          point.properties &&
          typeof point.properties.humus === 'number' &&
          point.properties.humus !== 0
        ) {
          const dist = turfDistance(meshCentroid, point, { units: 'kilometers' })
          if (dist <= searchRadiusKm && dist < minDistance) {
            minDistance = dist
            nearestPoint = point as HumusPointFeature
          }
        }
      }

      if (nearestPoint) {
        mean = nearestPoint.properties.humus
      }
    }

    const unitGridFeatureGeometry = polygons.features[i].geometry
    const intersects = !turfBooleanDisjoint(activeFeature.geometry, unitGridFeatureGeometry)

    const meshFeature: VfmapFeature = {
      type: 'Feature',
      geometry: polygons.features[i].geometry,
      properties: {
        humus_mean: mean,
        area: polygons.features[i].properties.area,
        intersects: intersects,
      },
    }
    vfmapFeatures.push(meshFeature)
  }
  return vfmapFeatures
}
