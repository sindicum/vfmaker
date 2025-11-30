import { addProtocol, removeProtocol } from 'maplibre-gl'
import {
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPolygonMode,
  ValidateNotSelfIntersecting,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { Protocol as PMTilesProtocol } from 'pmtiles'

import type { FeatureCollection } from 'geojson'
import type { MapLibreMap } from '@/types/map.type'
import type { ShallowRef } from 'vue'

export const SOURCE_NAME = 'registeredFields'
export const REGISTERED_LAYER_NAME = 'registeredLayer'
export const LINE_LAYER_NAME = 'editLineLayer'
export const FILL_LAYER_NAME = 'editFillLayer'
export const PMTILES = {
  url: import.meta.env.VITE_PMTILES_URL,
  source: '2025hokkaido_fudepolygon',
  sourceId: 'fude-polygon-pmtiles',
  lineLayerId: 'pmTileLineLayerId',
  fillLayerId: 'pmTileFillLayerId',
}
export const COORDINATE_PRECISION = 9

export function addSource(map: MapLibreMap, featureCollection: FeatureCollection) {
  map?.addSource(SOURCE_NAME, {
    type: 'geojson',
    data: featureCollection,
    promoteId: 'id',
  })
}

export function addLayer(map: MapLibreMap) {
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

export function removeLayer(map: MapLibreMap | null | undefined) {
  if (map?.getLayer(REGISTERED_LAYER_NAME)) {
    map.removeLayer(REGISTERED_LAYER_NAME)
  }
}

export function removeSource(map: MapLibreMap) {
  if (map?.getSource(SOURCE_NAME)) {
    map.removeSource(SOURCE_NAME)
  }
}

export function addEditLayer(map: MapLibreMap) {
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

export function removeEditLayer(map: MapLibreMap) {
  if (map?.getLayer(FILL_LAYER_NAME)) {
    map.removeLayer(FILL_LAYER_NAME)
  }
  if (map?.getLayer(LINE_LAYER_NAME)) {
    map.removeLayer(LINE_LAYER_NAME)
  }
}

export function addPMTilesSource(map: MapLibreMap) {
  removePMTitlesSource(map)

  const protocol = new PMTilesProtocol()
  addProtocol('pmtiles', protocol.tile)

  map?.addSource(PMTILES.sourceId, {
    type: 'vector',
    url: `pmtiles://${PMTILES.url}`,
    minzoom: 8,
    maxzoom: 16,
  })
}

export function addPMTilesLayer(map: MapLibreMap) {
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

export function removePMTitlesSource(map: MapLibreMap) {
  if (map?.getSource(PMTILES.sourceId)) {
    map?.removeSource(PMTILES.sourceId)
  }
  removeProtocol('pmtiles')
}

export function removePMTitlesLayer(map: MapLibreMap) {
  if (map?.getLayer(PMTILES.lineLayerId)) {
    map?.removeLayer(PMTILES.lineLayerId)
  }

  if (map?.getLayer(PMTILES.fillLayerId)) {
    map?.removeLayer(PMTILES.fillLayerId)
  }
}

export function setupTerraDraw(map: ShallowRef<MapLibreMap | null>) {
  const selectMode = new TerraDrawSelectMode({
    // selectModeでの地物の手動選択解除を無効化
    allowManualDeselection: false,
    styles: {
      selectedPolygonColor: '#FF0000',
      selectedPolygonFillOpacity: 0.4,
      selectedPolygonOutlineColor: '#FF0000',
      selectedPolygonOutlineWidth: 1,
      selectionPointColor: '#FF0000',
      selectionPointWidth: 7,
      selectionPointOutlineColor: '#FFFFFF',
      selectionPointOutlineWidth: 3,
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
          draggable: false,
          coordinates: {
            midpoints: true,
            draggable: true,
            deletable: true,
          },
        },
      },
    },
  })

  const polygonMode = new TerraDrawPolygonMode({
    styles: {
      fillColor: '#FF0000',
      fillOpacity: 0.2,
      outlineColor: '#FF0000',
      outlineWidth: 0.5,
      closingPointColor: '#FFFF00',
      closingPointWidth: 7,
      closingPointOutlineColor: '#FF0000',
      closingPointOutlineWidth: 3,
    },
    pointerDistance: 10,
    validation: (feature, { updateType }) => {
      if (updateType === 'finish') {
        return ValidateNotSelfIntersecting(feature)
      }
      return {
        valid: true,
      }
    },
  })

  const draw = new TerraDraw({
    tracked: true,
    adapter: new TerraDrawMapLibreGLAdapter({
      map: map?.value,
      coordinatePrecision: COORDINATE_PRECISION,
    }),
    modes: [selectMode, polygonMode],
  })

  return draw
}
