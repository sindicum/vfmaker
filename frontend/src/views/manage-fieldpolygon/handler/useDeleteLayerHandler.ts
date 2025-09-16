import { ref } from 'vue'

import { SOURCE_NAME, FILL_LAYER_NAME } from './LayerHandler'

import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { MapLibreMapRef } from '@/types/map.type'

export function useDeleteLayerHandler(map: MapLibreMapRef) {
  const deletePolygonId = ref<number | null>(null)

  // クリックハンドラーを追加
  function onClickDeleteLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.on('click', FILL_LAYER_NAME, clickDeleteFillLayer)
  }

  function offClickDeleteLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.off('click', FILL_LAYER_NAME, clickDeleteFillLayer)

    if (deletePolygonId.value === null) return
    mapInstance.setFeatureState(
      { source: SOURCE_NAME, id: deletePolygonId.value },
      { selected: false },
    )
    deletePolygonId.value = null
  }

  //「ポリゴンの削除」のクリックイベント
  function clickDeleteFillLayer(e: MapLayerMouseEvent) {
    const mapInstance = map?.value
    if (!mapInstance) return

    const feature = e.features?.[0]
    if (!feature || !feature.properties?.id) return
    const id = feature.properties.id
    deletePolygonId.value = id

    const features = mapInstance.queryRenderedFeatures({ layers: [FILL_LAYER_NAME] })
    features.forEach((f) => {
      if (f.id != null) {
        mapInstance.setFeatureState({ source: SOURCE_NAME, id: f.id }, { selected: false })
      }
    })

    mapInstance.setFeatureState({ source: SOURCE_NAME, id: id }, { selected: true })
  }

  return {
    deletePolygonId,
    onClickDeleteLayer,
    offClickDeleteLayer,
  }
}
