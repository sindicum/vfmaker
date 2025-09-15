import { ref } from 'vue'
import { removeEditLayer, COORDINATE_PRECISION } from './LayerHandler'

import type { MapLibreMapRef, DrawRef } from '@/types/map.type'
import type { MapMouseEvent } from 'maplibre-gl'
import { useStoreHandler } from '@/stores/indexedDbStoreHandler'

export function useUpdateLayerHandler(map: MapLibreMapRef, draw: DrawRef) {
  const updatePolygonId = ref<number | null>(null)
  const { readField } = useStoreHandler()

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
    updatePolygonId.value = null
  }

  async function clickUpdateFillLayer(e: MapMouseEvent) {
    const mapInstance = map?.value
    if (!mapInstance) return
    const drawInstance = draw?.value
    if (!drawInstance) return

    // クリック位置のフィーチャーを取得
    const features = mapInstance.queryRenderedFeatures(e.point, {
      layers: ['editFillLayer'], // 対象のレイヤーIDを指定
    })

    // if (!e.features) return
    // if (!e.features[0].properties) return

    updatePolygonId.value = features[0].properties.id
    if (!updatePolygonId.value) return

    const f = await readField(updatePolygonId.value)

    const handleFeatures = f.geometry.coordinates[0].map((f: number[]) => {
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
    // })
    // readFields().then(() => {
    //   const featureCollection = loadFields()
    //   const filteredFeatures = featureCollection.features.filter(
    //     (f) => f.properties && f.properties.id == updatePolygonId.value,
    //   )

    //   const handleFeatures = filteredFeatures[0].geometry.coordinates[0].map((f: number[]) => {
    //     const lng = f[0]
    //     const lat = f[1]
    //     return [
    //       parseFloat(lng.toFixed(COORDINATE_PRECISION)),
    //       parseFloat(lat.toFixed(COORDINATE_PRECISION)),
    //     ]
    //   })

    //   const newGeom = [
    //     {
    //       type: 'Feature' as const,
    //       geometry: {
    //         type: 'Polygon' as const,
    //         coordinates: [handleFeatures],
    //       },
    //       properties: {
    //         mode: 'polygon',
    //       },
    //     },
    //   ]

    //   const ids = drawInstance.addFeatures(newGeom)

    //   removeEditLayer(mapInstance)
    //   drawInstance.setMode('select')
    //   const featureId = ids[0].id
    //   if (featureId == null) return
    //   drawInstance.selectFeature(featureId)
    // })
  }

  return {
    updatePolygonId,
    onClickUpdateLayer,
    offClickUpdateLayer,
  }
}
