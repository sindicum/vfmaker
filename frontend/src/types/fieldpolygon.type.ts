import type { FeatureCollection, Feature, Polygon } from 'geojson'

// 圃場ポリゴンの基本形
export type FieldPolygonFeatureCollection = FeatureCollection<
  Polygon,
  FieldPolygonFeatureProperties
>
export type FieldPolygonFeature = Feature<Polygon, FieldPolygonFeatureProperties>
export interface FieldPolygonFeatureProperties {
  id: number
  uuid: string
  vfm_count: number
  area_are: number
  memo: string
}

export type DrawFeature = Feature<Polygon>
