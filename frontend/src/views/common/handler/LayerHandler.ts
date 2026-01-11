import type { MapLibreMap } from '@/types/map.type'
import type { FieldPolygonFeatureCollection } from '@/types/fieldpolygon.type'
import type {
  BaseGridFeatureCollection,
  HumusPointFeatureCollection,
  VfmapFeatureCollection,
} from '@/types/vfm.type'

export function addSource(map: MapLibreMap, featureCollection: FieldPolygonFeatureCollection) {
  if (map?.getSource('registeredFields')) {
    return
  }

  map?.addSource('registeredFields', {
    type: 'geojson',
    data: featureCollection,
    promoteId: 'id',
  })
}

export function removeSource(map: MapLibreMap) {
  if (map?.getSource('registeredFields')) {
    map.removeSource('registeredFields')
  }
}

export function addLayer(map: MapLibreMap) {
  if (map?.getLayer('registeredFillLayer')) {
    return
  }

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
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        'red', // 選択中
        'blue', // 通常
      ],
      'line-opacity': 0.6,
      'line-width': 3,
    },
  })
}

export function removeLayer(map: MapLibreMap) {
  if (map?.getLayer('registeredFillLayer')) {
    map.removeLayer('registeredFillLayer')
  }
  if (map?.getLayer('registeredLineLayer')) {
    map.removeLayer('registeredLineLayer')
  }
}

export function addHumusGrid(map: MapLibreMap, humusGrid: HumusPointFeatureCollection) {
  removeHumusGrid(map)

  map?.addSource('humusGrid', {
    type: 'geojson',
    data: humusGrid,
  })

  // map?.addLayer({
  //   id: 'humusGrid',
  //   type: 'circle',
  //   source: 'humusGrid',
  //   paint: {
  //     'circle-color': [
  //       // interpolateを指定
  //       'interpolate',
  //       // 補間形式を指定（配列）
  //       ['linear'],
  //       // 基準値の要素を指定
  //       ['get', 'humus'],
  //       // 基準値（入力）と色（出力）を交互に指定
  //       0,
  //       '#d7191c',
  //       25,
  //       '#f07c4a',
  //       50,
  //       '#fec980',
  //       75,
  //       '#ffffbf',
  //       100,
  //       '#c7e8ad',
  //       125,
  //       '#80bfab',
  //       150,
  //       '#2b83ba',
  //     ],
  //     'circle-radius': 5,
  //     'circle-opacity': 0.8,
  //   },
  // })

  // 腐植値のシンボル表示
  map?.addLayer({
    id: 'humusGrid-label',
    type: 'symbol',
    source: 'humusGrid',
    layout: {
      'text-field': ['get', 'humus'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
  })
}

export function removeHumusGrid(map: MapLibreMap) {
  // ポイントレイヤーの削除
  if (map && map.getLayer('humusGrid-label')) {
    map.removeLayer('humusGrid-label')
    map.removeSource('humusGrid')
  }
}

export function addHumusRaster(
  map: MapLibreMap,
  canvas: HTMLCanvasElement,
  bounds: [number, number, number, number],
) {
  removeHumusGrid(map)

  // canvasソースを追加
  map?.addSource('humusRaster', {
    type: 'canvas',
    canvas: canvas,
    coordinates: [
      [bounds[0], bounds[3]], // 左上
      [bounds[2], bounds[3]], // 右上
      [bounds[2], bounds[1]], // 右下
      [bounds[0], bounds[1]], // 左下
    ],
  })

  // ラスターレイヤーを追加（registeredLineLayerの下に配置）
  map?.addLayer(
    {
      id: 'humusRaster',
      type: 'raster',
      source: 'humusRaster',
      paint: {
        'raster-opacity': 0.95,
        'raster-resampling': 'nearest',
      },
    },
    'registeredLineLayer',
  )
}

export function removeHumusRaster(map: MapLibreMap) {
  if (map && map.getLayer('humusRaster')) {
    map.removeLayer('humusRaster')
    map.removeSource('humusRaster')
  }
}

export function addBaseGrid(map: MapLibreMap, baseGrid: BaseGridFeatureCollection) {
  removeBaseGrid(map)
  map?.addSource('base-grid', {
    type: 'geojson',
    data: baseGrid,
  })

  map?.addLayer({
    id: 'base-grid',
    type: 'line',
    source: 'base-grid',
    paint: {
      'line-color': 'red',
      'line-opacity': 0.6,
    },
  })
}

export function removeBaseGrid(map: MapLibreMap) {
  if (map && map.getLayer('base-grid')) {
    map.removeLayer('base-grid')
    map.removeSource('base-grid')
  }
}

export function addVraMap(
  map: MapLibreMap,
  vfmapFeatureCollection: VfmapFeatureCollection,
  id: string = 'default',
) {
  const applicationStep = [0.2, 0.1, 0, -0.1, -0.2]
  removeVraMap(map)

  map?.addSource('vra-map-' + id, {
    type: 'geojson',
    data: vfmapFeatureCollection,
  })

  map?.addLayer({
    id: 'vra-map-' + id,
    type: 'fill',
    source: 'vra-map-' + id,
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
        // // 青
        applicationStep[4],
        '#2b83ba',
        // 緑
        applicationStep[3],
        '#abdda4',
        // 黄
        applicationStep[2],
        '#ffffbf',
        // 橙
        applicationStep[1],
        '#fdae61',
        // 赤
        applicationStep[0],
        '#d7191c',
      ],
      'fill-opacity': 0.8,
    },
  })
  map?.addLayer({
    id: 'vra-map-symbol-' + id,
    source: 'vra-map-' + id,
    type: 'symbol',
    layout: {
      'text-field': ['get', 'amount_fertilization_unit'],
    },
  })
}

export function removeVraMap(map: MapLibreMap, id: string = 'default') {
  if (map?.getLayer('vra-map-' + id)) {
    map.removeLayer('vra-map-' + id)
    map.removeLayer('vra-map-symbol-' + id)
    map.removeSource('vra-map-' + id)
  }
}
