import { area as turfArea } from '@turf/turf'
import type { Feature, Polygon, GeoJsonProperties } from 'geojson'
import type { Field, UpdateField } from '@/types/indexedDb.type'

import type { GeoJSONStoreFeatures } from 'terra-draw'

// GeoJSONのProperties型を定義（nullを除外）
type DefinedProperties = Exclude<GeoJsonProperties, null>
// TerraDraw専用の型定義
type TerraDrawPolygonFeature = Feature<Polygon> & {
  id: string // TerraDrawは必ずidを持つ
}

// 型ガード関数
function isPolygonFeature(
  feature: GeoJSONStoreFeatures,
): feature is Feature<Polygon, DefinedProperties> {
  return (
    feature &&
    feature.geometry &&
    feature.geometry.type === 'Polygon' &&
    Array.isArray(feature.geometry.coordinates) &&
    feature.geometry.coordinates.length > 0 &&
    Array.isArray(feature.geometry.coordinates[0]) &&
    feature.geometry.coordinates[0].length >= 4
  )
}

export function usePolygonFeature() {
  // snapshotから安全にPolygonを取得
  const getPolygonFromSnapshot = (
    snapshot: GeoJSONStoreFeatures[] | undefined,
  ): TerraDrawPolygonFeature | null => {
    if (!snapshot || snapshot.length === 0) return null

    const feature = snapshot[0]
    if (!isPolygonFeature(feature)) {
      console.error('Invalid polygon feature:', feature)
      return null
    }
    // 型ガードを通過したので、安全にキャスト可能
    return feature as TerraDrawPolygonFeature
  }

  // 登録用のFieldを作成
  const createFieldFromPolygon = (
    feature: TerraDrawPolygonFeature,
    memo: string,
    uuid?: string, // 既存のUUIDまたは新規生成
  ): Field => {
    const area = turfArea(feature)

    return {
      uuid: uuid || feature.id || crypto.randomUUID(),
      geometry_type: 'Polygon', // 型ガードで保証済み
      geometry_coordinates: feature.geometry.coordinates, // 型安全
      vfm_count: 0,
      area_are: Math.round(area / 100),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memo,
    }
  }

  // 更新用のFieldを作成
  const createUpdateField = (feature: TerraDrawPolygonFeature, memo: string): UpdateField => {
    const area = turfArea(feature)

    return {
      geometry_coordinates: feature.geometry.coordinates, // 型安全
      area_are: Math.round(area / 100),
      memo: memo,
    }
  }

  return {
    isPolygonFeature,
    getPolygonFromSnapshot,
    createFieldFromPolygon,
    createUpdateField,
  }
}
