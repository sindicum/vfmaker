import type { FeatureCollection } from 'geojson'

interface FieldBase {
  id?: number
  uuid: string
  area_are: number
  memo: string
}

// IndexedDB用の圃場型
export interface Field extends FieldBase {
  geometry_type: 'Polygon'
  geometry_coordinates: number[][][]
  vfm_count?: number
  createdAt?: string
  updatedAt?: string
}

export interface UpdateField {
  geometry_coordinates: number[][][]
  area_are: number
  memo: string
}

// IndexedDB用のVFMマップ型（読み取り時）
export interface VfmMapDB {
  id: number
  uuid: string
  vfm: string // VfmMap型をパース
  amount_10a: number
  total_amount: number
  area: number
  fertilization_range: number
  memo: string
  created_at?: string
  updated_at?: string
}

// IndexedDB用のVFMマップ型（作成時）
export type VfmMapDBCreate = Omit<VfmMapDB, 'id'>

// 入力用のVFMマップ型
export interface VfmMapInput {
  uuid: string
  vfm: FeatureCollection
  amount_10a: number
  total_amount: number
  area: number
  fertilization_range: number
  memo: string
}
