import type { MapLibreMap, MapLibreGeoJSONSource } from '@/types/map.type'
import type { GeoJSONSource } from 'maplibre-gl'

// GeoJSONSourceかどうかを判定する型ガード
function isGeoJSONSource(source: unknown): source is GeoJSONSource {
  return (
    source !== null &&
    source !== undefined &&
    typeof source === 'object' &&
    'type' in source &&
    (source as { type: unknown }).type === 'geojson'
  )
}
// 安全にGeoJSONSourceを取得する関数
export function getGeoJSONSource(map: MapLibreMap, sourceId: string): MapLibreGeoJSONSource | null {
  if (!map) return null

  const source = map.getSource(sourceId)
  if (!source) {
    return null
  }

  if (!isGeoJSONSource(source)) {
    console.error(`Source '${sourceId}' is not a GeoJSON source`)
    return null
  }

  return source
}
