import { addProtocol } from 'maplibre-gl'
import {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPolygonMode,
  ValidateNotSelfIntersecting,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { Protocol as PMTilesProtocol } from 'pmtiles'

import type { FeatureCollection } from 'geojson'
import type { MaplibreMap } from '@/types/maplibre'
import type { ShallowRef } from 'vue'

export const SOURCE_NAME = 'registeredFields'
export const REGISTERED_LAYER_NAME = 'registeredLayer'
export const LINE_LAYER_NAME = 'editLineLayer'
export const FILL_LAYER_NAME = 'editFillLayer'
export const PMTILES = {
  url: import.meta.env.VITE_PMTILES_URL,
  source: '2024hokkaido_fudepolygon',
  sourceId: 'fude-polygon-pmtiles',
  lineLayerId: 'pmTileLineLayerId',
  fillLayerId: 'pmTileFillLayerId',
}
export const COORDINATE_PRECISION = 9

export function addSource(map: MaplibreMap, featureCollection: FeatureCollection) {
  map?.addSource(SOURCE_NAME, {
    type: 'geojson',
    data: featureCollection,
    promoteId: 'id',
  })
}

export function addLayer(map: MaplibreMap) {
  map?.addLayer({
    id: REGISTERED_LAYER_NAME,
    type: 'fill',
    source: SOURCE_NAME,
    paint: {
      'fill-color': 'blue',
      'fill-opacity': 0.6,
    },
  })
}

export function removeLayer(map: MaplibreMap) {
  if (map?.getLayer(REGISTERED_LAYER_NAME)) {
    map.removeLayer(REGISTERED_LAYER_NAME)
  }
}

// 未使用
export function removeSource(map: MaplibreMap) {
  if (map?.getSource(SOURCE_NAME)) {
    map.removeSource(SOURCE_NAME)
  }
}

export function addEditLayer(map: MaplibreMap) {
  map?.addLayer({
    id: LINE_LAYER_NAME,
    type: 'line',
    source: SOURCE_NAME,
    paint: {
      'line-color': 'gray',
      'line-width': 1,
    },
  })
  map?.addLayer({
    id: FILL_LAYER_NAME,
    type: 'fill',
    source: SOURCE_NAME,
    paint: {
      'fill-color': ['case', ['boolean', ['feature-state', 'selected'], false], 'red', 'yellow'],
      'fill-opacity': 0.3,
    },
  })
}

export function removeEditLayer(map: MaplibreMap) {
  if (map?.getLayer(FILL_LAYER_NAME)) {
    map.removeLayer(FILL_LAYER_NAME)
  }
  if (map?.getLayer(LINE_LAYER_NAME)) {
    map.removeLayer(LINE_LAYER_NAME)
  }
}

export function addPMTilesSource(map: MaplibreMap) {
  removePMTitlesSource(map)

  const protocol = new PMTilesProtocol()
  addProtocol('pmtiles', protocol.tile)

  map?.addSource(PMTILES.sourceId, {
    type: 'vector',
    url: `pmtiles://${PMTILES.url}`,
    minzoom: 8,
    maxzoom: 17,
  })
}

export function addPMTilesLayer(map: MaplibreMap) {
  removePMTitlesLayer(map)

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

export function removePMTitlesSource(map: MaplibreMap) {
  if (map?.getSource(PMTILES.sourceId)) {
    map?.removeSource(PMTILES.sourceId)
  }
}

export function removePMTitlesLayer(map: MaplibreMap) {
  if (map?.getLayer(PMTILES.lineLayerId)) {
    map?.removeLayer(PMTILES.lineLayerId)
  }

  if (map?.getLayer(PMTILES.fillLayerId)) {
    map?.removeLayer(PMTILES.fillLayerId)
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
