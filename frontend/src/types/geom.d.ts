import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'

export type BaseGrid = FeatureCollection<Polygon, { area: number }>

export type HumusPoints = FeatureCollection<Point, { humus: number }>

export type ApplicationGridProperties = {
  humus_mean: number
  area: number
  amount_fertilization_factor?: number
  amount_fertilization_unit?: number
  amount_fertilization_total?: number
}

export type ApplicationGridFeature = Feature<Polygon, ApplicationGridProperties>

export type ApplicationGridFeatures = ApplicationGridFeature[]
