import { ref } from 'vue'
import { removeEditLayer, COORDINATE_PRECISION } from './LayerHandler'
import { usePersistStore } from '@/stores/persistStore'

import type { DrawRef, MaplibreRef, MapMouseEvent } from '@/types/maplibre'

export function useUpdateLayerHandler(map: MaplibreRef, draw: DrawRef) {
  const updatePolygonId = ref('')
  const persistStore = usePersistStore()

  function onClickUpdateLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.on('click', 'editFillLayer', clickUpdateFillLayer)
  }

  function offClickUpdateLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return
    const drawInstance = draw?.value
    if (!drawInstance) return

    drawInstance.clear()

    mapInstance.off('click', 'editFillLayer', clickUpdateFillLayer)
    updatePolygonId.value = ''
  }

  function clickUpdateFillLayer(e: MapMouseEvent) {
    const mapInstance = map?.value
    if (!mapInstance) return
    const drawInstance = draw?.value
    if (!drawInstance) return

    updatePolygonId.value = e.features[0].properties.id
    const persistStoreFeatuers = persistStore.featurecollection.features
    const filteredFeatures = persistStoreFeatuers.filter(
      (f) => f.properties.id == updatePolygonId.value,
    )

    const handleFeatures = filteredFeatures[0].geometry.coordinates[0].map((f: number[]) => {
      const lng = f[0]
      const lat = f[1]
      return [
        parseFloat(lng.toFixed(COORDINATE_PRECISION)),
        parseFloat(lat.toFixed(COORDINATE_PRECISION)),
      ]
    })

    const newGeom = [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [handleFeatures],
        },
        properties: {
          mode: 'polygon',
        },
      },
    ]

    const ids = drawInstance.addFeatures(newGeom)

    removeEditLayer(mapInstance)
    drawInstance.setMode('select')

    const featureId = ids[0].id
    if (featureId == null) return
    drawInstance.selectFeature(featureId)
  }

  return {
    updatePolygonId,
    onClickUpdateLayer,
    offClickUpdateLayer,
  }
}
