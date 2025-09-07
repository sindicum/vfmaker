import type { FeatureCollection } from 'geojson'
// import type { ApplicationGridProperties } from './geom'

// export type VariableFertilizationMap = FeatureCollection<
//   Polygon,
//   ApplicationGridProperties
// >

export interface VariableFertilizationMap {
  vfm: FeatureCollection
  id: string
  created_at: string
  amount_10a: number
  total_amount: number
  area: number
  fertilization_range: number
  memo: string
}

// export type ApplicationGridProperties = {
//   humus_mean: number
//   area: number
//   amount_fertilization_factor?: number
//   amount_fertilization_unit?: number
//   amount_fertilization_total?: number
//   intersects?: boolean
// }
