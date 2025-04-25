import { addProtocol } from 'maplibre-gl'
import {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPolygonMode,
  ValidateNotSelfIntersecting,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { union as turfUnion, featureCollection as turfFeatureCollection } from '@turf/turf'
import { Protocol as PMTilesProtocol } from 'pmtiles'

import type { FeatureCollection, Feature, Polygon } from 'geojson'
import type { MaplibreMap, Draw } from '@/types/maplibre'
import type { ShallowRef } from 'vue'

const PMTILES = {
  url: import.meta.env.VITE_PMTILES_URL,
  source: '2024hokkaido_fudepolygon',
  sourceId: 'fude-polygon-pmtiles',
  lineLayerId: 'pmTileLineLayerId',
  fillLayerId: 'pmTileFillLayerId',
}

const COORDINATE_PRECISION = 9

export function addSource(map: MaplibreMap, featureCollection: FeatureCollection) {
  map?.addSource('registeredFields', {
    type: 'geojson',
    data: featureCollection,
    promoteId: 'id',
  })
}

export function addLayer(map: MaplibreMap) {
  map?.addLayer({
    id: 'registeredLayer',
    type: 'fill',
    source: 'registeredFields',
    paint: {
      'fill-color': 'blue',
      'fill-opacity': 0.6,
    },
  })
}

export function removeLayer(map: MaplibreMap) {
  if (map?.getLayer('registeredLayer')) {
    map.removeLayer('registeredLayer')
  }
}

export function addEditLayer(map: MaplibreMap) {
  map?.addLayer({
    id: 'editLineLayer',
    type: 'line',
    source: 'registeredFields',
    paint: {
      'line-color': 'gray',
      'line-width': 1,
    },
  })
  map?.addLayer({
    id: 'editFillLayer',
    type: 'fill',
    source: 'registeredFields',
    paint: {
      'fill-color': ['case', ['boolean', ['feature-state', 'selected'], false], 'red', 'yellow'],
      'fill-opacity': 0.3,
    },
  })
}

export function removeEditLayer(map: MaplibreMap) {
  if (map?.getLayer('editFillLayer')) {
    map.removeLayer('editFillLayer')
  }
  if (map?.getLayer('editLineLayer')) {
    map.removeLayer('editLineLayer')
  }
}

export function addPMtiles(map: MaplibreMap, draw: Draw) {
  const protocol = new PMTilesProtocol()
  addProtocol('pmtiles', protocol.tile)
  addPMTilesSourceLayer(map)

  map?.on('click', PMTILES.fillLayerId, (e) => {
    if (!e.features) return

    const clickedPolygonUuid = e.features[0].properties.polygon_uuid

    const features = map.querySourceFeatures(PMTILES.sourceId, {
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
        (feature) => feature.geometry.type === 'Polygon',
      ) as Feature<Polygon>[]
      const unionResult = turfUnion(turfFeatureCollection(polygonFeatures))

      if (unionResult && unionResult.geometry.type === 'Polygon') {
        feature = unionResult as Feature<Polygon>
      } else {
        feature = null
      }
    }

    if (feature == null) return

    const coordinates = feature.geometry.coordinates[0].map((f: number[]) => {
      const lng = f[0]
      const lat = f[1]
      return [
        parseFloat(lng.toFixed(COORDINATE_PRECISION)),
        parseFloat(lat.toFixed(COORDINATE_PRECISION)),
      ]
    })

    //   clickedPolygonUuidは消失。idはdrawのidが付番される。
    const newGeom = [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coordinates],
        },
        properties: {
          mode: 'polygon',
        },
      },
    ]
    const ids = draw?.addFeatures(newGeom)
    if (ids == undefined) return

    removePMTitlesSourceLayer(map)
    draw?.setMode('select')
    const featureId = ids[0].id
    if (featureId == null) return
    draw?.selectFeature(featureId)
  })
}

export function addPMTilesSourceLayer(map: MaplibreMap) {
  removePMTitlesSourceLayer(map)

  map?.addSource(PMTILES.sourceId, {
    type: 'vector',
    url: `pmtiles://${PMTILES.url}`,
    minzoom: 8,
    maxzoom: 17,
  })

  map?.addLayer(
    {
      id: PMTILES.lineLayerId,
      type: 'line',
      source: PMTILES.sourceId,
      'source-layer': PMTILES.source,
      paint: {
        'line-color': 'gray',
        'line-width': 1,
      },
    },
    'registeredLayer',
  )

  map?.addLayer(
    {
      id: PMTILES.fillLayerId,
      type: 'fill',
      source: PMTILES.sourceId,
      'source-layer': PMTILES.source,
      paint: {
        'fill-color': 'yellow',
        'fill-opacity': 0.3,
      },
    },
    'registeredLayer',
  )
}

export function removePMTitlesSourceLayer(map: MaplibreMap) {
  if (map?.getLayer(PMTILES.lineLayerId)) {
    map.removeLayer(PMTILES.lineLayerId)
  }

  if (map?.getLayer(PMTILES.fillLayerId)) {
    map.removeLayer(PMTILES.fillLayerId)
  }

  if (map?.getSource(PMTILES.sourceId)) {
    map.removeSource(PMTILES.sourceId)
  }
}

export function setupTerraDraw(map: ShallowRef<MaplibreMap | null>) {
  const draw = new TerraDraw({
    tracked: true,
    adapter: new TerraDrawMapLibreGLAdapter({
      map: map?.value,
      coordinatePrecision: COORDINATE_PRECISION,
    }),
    modes: [
      new TerraDrawSelectMode({
        styles: {
          selectedPolygonColor: '#FF0000',
          selectedPolygonFillOpacity: 0.4,
          selectedPolygonOutlineColor: '#FF0000',
          selectedPolygonOutlineWidth: 1,
          selectionPointColor: '#FF0000',
          selectionPointWidth: 5,
          selectionPointOutlineColor: '#FFFFFF',
          selectionPointOutlineWidth: 2,
          midPointColor: '#FF0000',
          midPointWidth: 2,
          midPointOutlineColor: '#FF0000',
          midPointOutlineWidth: 1,
        },
        flags: {
          polygon: {
            feature: {
              scaleable: true,
              rotateable: true,
              draggable: true,
              coordinates: {
                midpoints: true,
                draggable: true,
                deletable: true,
              },
            },
          },
        },
      }),
      new TerraDrawPolygonMode({
        styles: {
          fillColor: '#FF0000',
          fillOpacity: 0.2,
          outlineColor: '#FF0000',
          outlineWidth: 0.5,
          closingPointColor: '#FF0000',
          closingPointWidth: 5,
          closingPointOutlineColor: '#FFFFFF',
          closingPointOutlineWidth: 2,
        },
        pointerDistance: 30,
        validation: (feature, { updateType }) => {
          if (updateType === 'finish' || updateType === 'commit') {
            return ValidateNotSelfIntersecting(feature)
          }
          return {
            valid: true,
          }
        },
      }),
    ],
  })

  return draw
}
