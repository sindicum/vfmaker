import { ref } from 'vue'
import { addLayer, removeEditLayer } from './LayerHandler'

import type { MaplibreRef, MapMouseEvent } from '@/types/maplibre'

export function useDeleteLayerHandler(map: MaplibreRef) {
  const deletePolygonId = ref('')

  const SOURCE_NAME = 'registeredFields'
  const LAYER_NAME = 'editFillLayer'

  function onClickDeleteLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.on('click', LAYER_NAME, clickDeleteFillLayer)
  }

  function offClickDeleteLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    // TODO以下コードが必要なのか否か不明
    removeEditLayer(mapInstance)
    addLayer(mapInstance)
    mapInstance.setFeatureState(
      { source: 'registeredFields', id: deletePolygonId.value },
      { selected: false },
    )
    mapInstance.off('click', LAYER_NAME, clickDeleteFillLayer)
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

    const features = mapInstance.queryRenderedFeatures({ layers: [LAYER_NAME] })
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
