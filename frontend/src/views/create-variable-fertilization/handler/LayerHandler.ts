import type { MaplibreMap } from '@/types/maplibre'
import type { FeatureCollection } from 'geojson'

export function addSource(map: MaplibreMap, featureCollection: FeatureCollection) {
  map?.addSource('registeredFields', {
    type: 'geojson',
    data: featureCollection,
    promoteId: 'id',
  })
}

export function addLayer(map: MaplibreMap) {
  map?.addLayer({
    id: 'registeredFillLayer',
    type: 'fill',
    source: 'registeredFields',
    paint: {
      'fill-color': 'white',
      'fill-opacity': 0.1,
    },
  })
  map?.addLayer({
    id: 'registeredLineLayer',
    type: 'line',
    source: 'registeredFields',
    paint: {
      'line-color': 'blue',
      'line-opacity': 0.6,
      'line-width': 3,
    },
  })
}

export function removeLayer(map: MaplibreMap | null | undefined) {
  if (map?.getLayer('registeredFillLayer')) {
    map.removeLayer('registeredFillLayer')
  }
  if (map?.getLayer('registeredLineLayer')) {
    map.removeLayer('registeredLineLayer')
  }
}

export function removeSource(map: MaplibreMap) {
  if (map?.getSource('registeredFields')) {
    map.removeSource('registeredFields')
  }
}

export function addHumusGrid(map: MaplibreMap, humusGrid: FeatureCollection) {
  removeHumusGrig(map)

  map?.addSource('humusGrid', {
    type: 'geojson',
    data: humusGrid,
  })

  map?.addLayer({
    id: 'humusGrid',
    type: 'circle',
    source: 'humusGrid',
    paint: {
      'circle-color': [
        // interpolateを指定
        'interpolate',
        // 補間形式を指定（配列）
        ['linear'],
        // 基準値の要素を指定
        ['get', 'humus'],
        // 基準値（入力）と色（出力）を交互に指定
        0,
        '#d7191c',
        25,
        '#f07c4a',
        50,
        '#fec980',
        75,
        '#ffffbf',
        100,
        '#c7e8ad',
        125,
        '#80bfab',
        150,
        '#2b83ba',
      ],
      'circle-radius': 5,
      'circle-opacity': 0.8,
    },
  })

  // 腐植値のシンボル表示
  // map?.addLayer({
  //   id: 'humusGrid-label',
  //   type: 'symbol',
  //   source: 'humusGrid',
  //   layout: {
  //     'text-field': ['get', 'humus'],
  //     'text-size': 12,
  //   },
  //   paint: {
  //     'text-color': '#000000',
  //     'text-halo-color': '#ffffff',
  //     'text-halo-width': 1,
  //   },
  // })
}

export function removeHumusGrig(map: MaplibreMap) {
  if (map && map.getLayer('humusGrid')) {
    map.removeLayer('humusGrid')
    map.removeSource('humusGrid')
  }
}

export function addBaseMesh(map: MaplibreMap, baseMesh: FeatureCollection) {
  removeBaseMesh(map)
  map?.addSource('base-mesh', {
    type: 'geojson',
    data: baseMesh,
  })

  map?.addLayer({
    id: 'base-mesh',
    type: 'line',
    source: 'base-mesh',
    paint: {
      'line-color': 'red',
      'line-opacity': 0.6,
    },
  })
}

export function removeBaseMesh(map: MaplibreMap) {
  if (map && map.getLayer('base-mesh')) {
    map.removeLayer('base-mesh')
    map.removeSource('base-mesh')
  }
}

export function addVraMap(
  map: MaplibreMap,
  humusMeanFeatureCollection: FeatureCollection,
  applicationStep: [number, number, number, number, number],
) {
  removeVraMap(map)

  map?.addSource('vra-map', {
    type: 'geojson',
    data: humusMeanFeatureCollection,
  })

  map?.addLayer({
    id: 'vra-map',
    type: 'fill',
    source: 'vra-map',
    paint: {
      'fill-color': [
        // interpolateを指定
        'interpolate',
        // 補間形式を指定（配列）
        ['linear'],
        ['get', 'amount_fertilization_factor'],
        // 設定無し
        -1,
        '#000000',
        // // 赤
        applicationStep[4],
        '#d7191c',
        // 橙
        applicationStep[3],
        '#fdae61',
        // 黄
        applicationStep[2],
        '#ffffbf',
        // 緑
        applicationStep[1],
        '#abdda4',
        // 青
        applicationStep[0],
        '#2b83ba',
      ],
      'fill-opacity': 0.8,
    },
  })
  map?.addLayer({
    id: 'vra-map-symbol',
    source: 'vra-map',
    type: 'symbol',
    layout: {
      'text-field': ['get', 'amount_fertilization_unit'],
    },
  })
}

export function removeVraMap(map: MaplibreMap) {
  if (map?.getLayer('vra-map')) {
    map.removeLayer('vra-map')
    map.removeLayer('vra-map-symbol')
    map.removeSource('vra-map')
  }
}
