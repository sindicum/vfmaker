import {
  union as turfUnion,
  featureCollection as turfFeatureCollection,
  simplify as turfSimplify,
} from '@turf/turf'
import {
  removePMTitlesSource,
  removePMTitlesLayer,
  PMTILES,
  COORDINATE_PRECISION,
} from './LayerHandler'

import type { MapLibreMapRef, DrawRef } from '@/types/map.type'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { MapLayerMouseEvent } from 'maplibre-gl'

export function useRegisterFudepolyHandler(map: MapLibreMapRef, draw: DrawRef) {
  function onClickRegisterFudepolyLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.on('click', PMTILES.fillLayerId, clickRegisterFudepolyLayer)
  }

  function offClickRegisterFudepolyLayer() {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.off('click', PMTILES.fillLayerId, clickRegisterFudepolyLayer)
  }

  function clickRegisterFudepolyLayer(e: MapLayerMouseEvent) {
    const mapInstance = map?.value
    if (!mapInstance) return
    const drawInstance = draw?.value
    if (!drawInstance) return
    if (!e.features) return
    if (!e.features[0].properties) return

    const clickedPolygonUuid = e.features[0].properties.polygon_uuid

    const features = mapInstance.querySourceFeatures(PMTILES.sourceId, {
      sourceLayer: PMTILES.source,
    })
    const filteredFeatures = features.filter((f) => f.properties.polygon_uuid == clickedPolygonUuid)

    let feature: Feature<Polygon> | null = null

    if (filteredFeatures.length === 1) {
      const f = turfFeatureCollection(filteredFeatures).features[0]

      if (f.geometry.type === 'Polygon') {
        feature = f as Feature<Polygon>
      }
    } else {
      const polygonFeatures = filteredFeatures.filter(
        (feature) =>
          feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon',
      ) as Feature<Polygon | MultiPolygon>[]

      const unionResult = turfUnion(turfFeatureCollection(polygonFeatures))

      if (unionResult && unionResult.geometry.type === 'Polygon') {
        feature = unionResult as Feature<Polygon>
      } else {
        feature = null
      }
    }

    if (feature == null) return

    // turf.simplifyを使用してポイントをtolerance: 0.0001 (約10m)で間引き
    const simplifiedFeature = turfSimplify(feature, { tolerance: 0.0001, highQuality: true })
    const simplifiedCoordinates = simplifiedFeature.geometry.coordinates[0].map((f: number[]) => {
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
          coordinates: [simplifiedCoordinates],
        },
        properties: {
          mode: 'polygon',
        },
      },
    ]
    const ids = drawInstance.addFeatures(newGeom)
    if (ids == undefined) return

    removePMTitlesLayer(mapInstance)
    removePMTitlesSource(mapInstance)
    drawInstance.setMode('select')
    const featureId = ids[0].id
    if (featureId == null) return
    drawInstance.selectFeature(featureId)
  }

  return {
    onClickRegisterFudepolyLayer,
    offClickRegisterFudepolyLayer,
  }
}
