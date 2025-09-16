import type { Map, MapLayerMouseEvent, GeoJSONSource, RasterSourceSpecification } from 'maplibre-gl'
import type { TerraDraw } from 'terra-draw'
import type { ShallowRef } from 'vue'
import type { FieldPolygonFeature } from '@/types/fieldpolygon.type'

// MapLibre関連の型定義（統一した命名規則）
export type MapLibreMap = Map | null
export type MapLibreMapRef = ShallowRef<MapLibreMap>
export type MapLibreGeoJSONSource = GeoJSONSource
export type MapLibreRasterSourceSpecification = RasterSourceSpecification

// 地図イベント関連
export type MapLibreMouseEvent = MapLayerMouseEvent & {
  // features?: Feature[]
  features?: FieldPolygonFeature[]
}

// TerraDraw関連
export type Draw = TerraDraw | null
export type DrawRef = ShallowRef<Draw>
