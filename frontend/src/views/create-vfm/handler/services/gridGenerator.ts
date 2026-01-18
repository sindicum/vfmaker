import {
  area as turfArea,
  bbox as turfBbox,
  bboxPolygon as turfBboxPolygon,
  centroid as turfCentroid,
  destination as turfDestination,
  distance as turfDistance,
  point as turfPoint,
  transformRotate as turfTransformRotate,
} from '@turf/turf'

import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { GridOrigin } from '@/types/common.type'

export type GridCountCallback = (count: number) => void

export type GridGenerationResult = {
  grid: FeatureCollection<Polygon, { area: number }>
  gridCount: number
}

/**
 * 最小外接矩形（MBR）を与える回転角度を三分探索で求める
 * @param geom 対象のFeature
 * @returns 最適な回転角度（0-90度）
 */
export function fitRotatedBboxDeg(geom: Feature): number {
  const centroid = turfCentroid(turfBboxPolygon(turfBbox(geom)))

  const calcBBoxArea = (deg: number): number => {
    const rotated = turfTransformRotate(geom, deg, { pivot: centroid })
    return turfArea(turfBboxPolygon(turfBbox(rotated)))
  }

  let lo = 0
  let hi = 90
  const epsilon = 0.1 // 精度（度）

  // 三分探索：O(log n) で最小値を探索
  while (hi - lo > epsilon) {
    const mid1 = lo + (hi - lo) / 3
    const mid2 = hi - (hi - lo) / 3

    if (calcBBoxArea(mid1) < calcBBoxArea(mid2)) {
      hi = mid2
    } else {
      lo = mid1
    }
  }

  return Math.round(((lo + hi) / 2) * 10) / 10
}

/**
 * グリッドポリゴンを生成する
 * @param field_feature 対象の圃場Feature
 * @param gridEW 東西方向のグリッド幅（m）
 * @param gridNS 南北方向のグリッド幅（m）
 * @param origin グリッド起点（NW: 北西、SE: 南東）
 * @returns グリッドのFeatureCollectionとグリッド数
 * @throws グリッド数が2000を超えた場合
 */
export function drawBaseMeshPolygon(
  field_feature: Feature,
  gridEW: number,
  gridNS: number,
  origin: GridOrigin = 'NW',
): GridGenerationResult {
  const effectiveGridEW = Math.max(gridEW, 10)
  const effectiveGridNS = Math.max(gridNS, 10)

  const field_feature_bbox = turfBbox(field_feature)

  // Bounding box corner coordinates
  const bbox_NW_coords = [field_feature_bbox[0], field_feature_bbox[3]]
  const bbox_NE_coords = [field_feature_bbox[2], field_feature_bbox[3]]
  const bbox_SE_coords = [field_feature_bbox[2], field_feature_bbox[1]]
  const bbox_SW_coords = [field_feature_bbox[0], field_feature_bbox[1]]

  // Calculate number of columns (EW direction)
  const bbox_columns = Math.ceil(
    (turfDistance(
      turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]]),
      turfPoint([bbox_NE_coords[0], bbox_NE_coords[1]]),
      { units: 'kilometers' },
    ) *
      1000) /
      effectiveGridEW,
  )
  // Calculate number of rows (NS direction)
  const bbox_rows = Math.ceil(
    (turfDistance(
      turfPoint([bbox_SW_coords[0], bbox_SW_coords[1]]),
      turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]]),
      { units: 'kilometers' },
    ) *
      1000) /
      effectiveGridNS,
  )

  const gridCount = bbox_rows * bbox_columns

  if (gridCount > 2000) {
    throw new Error(
      'グリッド数が上限（2000）を超えているので、グリッドサイズを小さくしてください。',
    )
  }

  const grid_feature_collection: Feature<Polygon, { area: number }>[] = []

  // Origin-dependent configuration
  // NW: start from NW, move East then South, fractional cells on East/South
  // SE: start from SE, move West then North, fractional cells on West/North
  const isNW = origin === 'NW'
  const startCoords = isNW ? bbox_NW_coords : bbox_SE_coords
  const ewBearing = isNW ? 90 : 270 // East or West
  const nsBearing = isNW ? 180 : 0 // South or North
  const ewSnapLng = isNW ? bbox_NE_coords[0] : bbox_NW_coords[0]
  const nsSnapLat = isNW ? bbox_SW_coords[1] : bbox_NE_coords[1]
  const rowStartLng = isNW ? bbox_NW_coords[0] : bbox_SE_coords[0]

  let current_point_feature = turfPoint([startCoords[0], startCoords[1]])

  for (let row_count = 1; row_count <= bbox_rows; row_count++) {
    for (let col_count = 1; col_count <= bbox_columns; col_count++) {
      const currentCoords = current_point_feature.geometry.coordinates

      // Calculate the 4 corners of this cell
      let corner1Lat: number // NS direction edge (next row direction)
      let corner2Lng: number // EW direction edge (next column direction)

      // NS direction: snap to boundary on last row
      if (row_count < bbox_rows) {
        corner1Lat = turfDestination(current_point_feature, gridNS / 1000, nsBearing, {
          units: 'kilometers',
        }).geometry.coordinates[1]
      } else {
        corner1Lat = nsSnapLat
      }

      // EW direction: snap to boundary on last column
      if (col_count < bbox_columns) {
        corner2Lng = turfDestination(current_point_feature, effectiveGridEW / 1000, ewBearing, {
          units: 'kilometers',
        }).geometry.coordinates[0]
      } else {
        corner2Lng = ewSnapLng
      }

      // Build the 4 corners based on origin
      let NW_coords: number[]
      let NE_coords: number[]
      let SE_coords: number[]
      let SW_coords: number[]

      if (isNW) {
        // NW origin: current point is NW corner
        NW_coords = [currentCoords[0], currentCoords[1]]
        NE_coords = [corner2Lng, currentCoords[1]]
        SE_coords = [corner2Lng, corner1Lat]
        SW_coords = [currentCoords[0], corner1Lat]
      } else {
        // SE origin: current point is SE corner
        SE_coords = [currentCoords[0], currentCoords[1]]
        SW_coords = [corner2Lng, currentCoords[1]]
        NW_coords = [corner2Lng, corner1Lat]
        NE_coords = [currentCoords[0], corner1Lat]
      }

      // Create polygon (counter-clockwise winding)
      const mesh_feature: Feature<Polygon, { area: number }> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[SW_coords, SE_coords, NE_coords, NW_coords, SW_coords]],
        },
        properties: {
          area: 0,
        },
      }

      mesh_feature.properties.area = Math.round(turfArea(mesh_feature))
      grid_feature_collection.push(mesh_feature)

      // Move to next column position
      if (col_count < bbox_columns) {
        current_point_feature = turfPoint([corner2Lng, currentCoords[1]])
      } else {
        // Move to next row, reset column position
        current_point_feature = turfPoint([rowStartLng, corner1Lat])
      }
    }
  }

  return {
    grid: { type: 'FeatureCollection', features: grid_feature_collection },
    gridCount,
  }
}
