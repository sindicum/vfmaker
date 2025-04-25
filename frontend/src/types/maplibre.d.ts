import type { Map, MapMouseEvent, GeoJSONSource, RasterSourceSpecification } from 'maplibre-gl'
import type { TerraDraw } from 'terra-draw'
import type { ShallowRef } from 'vue'

export type MaplibreMap = Map | null
export type MapMouseEvent = MapMouseEven
export type GeoJSONSource = GeoJSONSource

export type RasterSourceSpecification = RasterSourceSpecification
export type dialogType =
  | 'rotationAngle'
  | 'gridEW'
  | 'gridNS'
  | 'buffer'
  | 'baseFertilizationAmount'
  | 'variableFertilizationRangeRate'
  | ''

export type Draw = TerraDraw | null

export type MaplibreRef = ShallowRef<MaplibreMap>

export type DrawRef = ShallowRef<Draw>
