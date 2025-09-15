import type { FeatureCollection, Feature, Polygon, Point } from 'geojson'

// TODO:indexedDBとの整合性

// 可変施肥マップの基本型（統一版）
export interface VfmMap {
  id?: number | null
  uuid: string
  vfm: FeatureCollection
  amount_10a: number
  total_amount: number
  area: number
  fertilization_range: number
  memo: string
  created_at?: string
  updated_at?: string
}

// 施肥量計算の設定型
export interface FertilizationConfig {
  baseAmount: number
  rangePercentage: number
  gridSize: {
    ew: number
    ns: number
  }
  rotationAngle: number
  buffer: number
}

// 施肥グリッド内の各Featureに割り当てられたプロパティ

// 施肥グリッドの基本型
export type BaseGridFeatureCollection = FeatureCollection<Polygon, BaseGridProperties>
export type BaseGridFeature = Feature<Polygon, BaseGridProperties>
export type BaseGridProperties = {
  area: number
}

// 可変施肥マップの基本型
export type VfmapFeatureCollection = FeatureCollection<Polygon, VfmapProperties>
export type VfmapFeature = Feature<Polygon, VfmapProperties>
// 施肥グリッドのプロパティ
export interface VfmapProperties {
  humus_mean: number
  area: number
  amount_fertilization_factor?: number
  amount_fertilization_unit?: number
  intersects?: boolean
}

// 腐植マップから生成したポイントデータの型
export type HumusPointFeatureCollection = FeatureCollection<Point, { humus: number }>
export type HumusPointFeature = Feature<Point, { humus: number }>
