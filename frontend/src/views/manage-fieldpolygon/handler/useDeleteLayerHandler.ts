import { ref } from 'vue'
import type { MaplibreRef, MapMouseEvent } from '@/types/common'

import { SOURCE_NAME, FILL_LAYER_NAME } from './LayerHandler'

export function useDeleteLayerHandler(map: MaplibreRef) {
  const deletePolygonId = ref('')

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
    mapInstance.setFeatureState(
      { source: SOURCE_NAME, id: deletePolygonId.value },
      { selected: false },
    )
    deletePolygonId.value = ''
  }

  //「ポリゴンの削除」のクリックイベント
  function clickDeleteFillLayer(e: MapMouseEvent) {
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
