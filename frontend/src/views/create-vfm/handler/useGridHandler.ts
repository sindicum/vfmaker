import { computed, ref, watch } from 'vue'

import proj4 from 'proj4'
import {
  bbox as turfBbox,
  bboxPolygon as turfBboxPolygon,
  buffer as turfBuffer,
  centroid as turfCentroid,
  pointsWithinPolygon as turfPointsWithinPolygon,
  transformRotate as turfTransformRotate,
} from '@turf/turf'

import { getGeoJSONSource } from '../../common/composables/useMapSoruce'
import { addHumusGrid, addBaseGrid, addHumusRaster } from '../../common/handler/LayerHandler'

import { drawBaseMeshPolygon, fitRotatedBboxDeg } from './services/gridGenerator'
import { calculateHumusStats, getHumusPointGridBbox } from './services/humusCalculator'
import { createHumusRasterImage } from './services/humusRasterRenderer'
import { extractCogHumusValues } from './services/cogProcessor'

import { useConfigPersistStore } from '@/stores/configPersistStore'
import { useNotificationStore } from '@/notifications'

import type { Feature, Point, Polygon } from 'geojson'
import type { MapLibreMapRef, MapLibreMouseEvent } from '@/types/map.type'
import type { HumusPointFeatureCollection, BaseGridFeatureCollection } from '@/types/vfm.type'
import type { FieldPolygonFeatureCollection, FieldPolygonFeature } from '@/types/fieldpolygon.type'
import type { GridOrigin } from '@/types/common.type'

/**
 * グリッド生成と腐植データ処理を管理するComposable
 * @param map MapLibreのmap参照
 */
export function useGridHandler(map: MapLibreMapRef) {
  const configPersistStore = useConfigPersistStore()
  const notificationStore = useNotificationStore()

  // 圃場データ
  const baseFeatureCollection: FieldPolygonFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  }
  const loadedFeatureCollection = ref(baseFeatureCollection)
  const activeFeature = ref<FieldPolygonFeature | null>(null)

  // グリッド設定
  const gridRotationAngle = ref<number | null>(null)
  const gridEW = ref<number>(20)
  const gridNS = ref<number>(20)
  const buffer = ref<number>(0)
  const gridOrigin = ref<GridOrigin>('NW')
  const gridCount = ref<number>(0)

  // 腐植データ
  const humusMean = ref<number | null>(null)
  const humusStdDev = ref<number | null>(null)
  const humusPoint = ref<HumusPointFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  })
  const humusRaster = ref<HTMLCanvasElement | undefined>()
  const humusRasterBbox = ref<[number, number, number, number]>([0, 0, 0, 0])

  // グリッドデータ
  const baseGrid = ref<BaseGridFeatureCollection | null>(null)

  // バッファー適用後の圃場ポリゴン
  const activeFeatureBufferComputed = computed<Feature<Polygon> | undefined>(() => {
    if (!activeFeature.value) return undefined

    const bufferMeter = buffer.value / 1000
    const result = turfBuffer(activeFeature.value, bufferMeter, {
      units: 'kilometers',
    })

    if (!result) return undefined
    return result as Feature<Polygon>
  })

  // グリッド設定変更時の処理
  watch([gridRotationAngle, gridEW, gridNS, buffer, gridOrigin], (current, before) => {
    const mapInstance = map?.value
    if (!mapInstance || !activeFeatureBufferComputed.value) return
    const beforeGridRotationAngle = before[0]

    // gridRotationAngleの更新前がnullだったら処理中断
    if (beforeGridRotationAngle === null) return

    // ターゲットポリゴンのbbox算出
    const bbox = turfBbox(activeFeatureBufferComputed.value)
    // ターゲットポリゴンのbboxの重心を算出（回転中心点）
    const centroid = turfCentroid(turfBboxPolygon(bbox))
    // ターゲットポリゴンを回転
    const target_polygon_rotated = turfTransformRotate(
      activeFeatureBufferComputed.value,
      Number(gridRotationAngle.value),
      {
        pivot: centroid,
      },
    )

    try {
      const result = drawBaseMeshPolygon(
        target_polygon_rotated,
        gridEW.value,
        gridNS.value,
        gridOrigin.value,
      )

      // グリッド数の警告
      if (result.gridCount >= 1000 && result.gridCount <= 2000) {
        notificationStore.showAlert(
          'Warn',
          'グリッドが細かいので、マップ作成に時間がかかる場合があります。',
        )
      }
      gridCount.value = result.gridCount

      const turfRotated = turfTransformRotate(result.grid, -Number(gridRotationAngle.value), {
        pivot: centroid,
      })

      baseGrid.value = turfRotated

      const source = getGeoJSONSource(mapInstance, 'base-grid')

      if (!source) {
        addBaseGrid(mapInstance, baseGrid.value)
      } else {
        source.setData(baseGrid.value)
      }
    } catch (error) {
      if (error instanceof Error) {
        notificationStore.showAlert('Error', error.message)
      } else {
        notificationStore.showAlert('Error', '不明なエラーが発生しました')
      }
    }
  })

  /**
   * 圃場クリック時の処理
   */
  async function onClickField(e: MapLibreMouseEvent) {
    const mapInstance = map?.value
    if (!mapInstance) return
    if (!e.features || e.features.length === 0) return

    const activeFeatureId = e.features[0].properties.id
    const filteredFeature = loadedFeatureCollection.value.features.filter(
      (f) => f.properties.id === activeFeatureId,
    )

    activeFeature.value = filteredFeature[0]

    if (!activeFeatureBufferComputed.value) return

    // 境界域の外側の腐植値を取得するため10m拡張
    const activeFeatureBufferExtended = turfBuffer(activeFeatureBufferComputed.value, 0.01, {
      units: 'kilometers',
    })
    if (!activeFeatureBufferExtended) return

    const activeFeatureBufferExtendedBbox = turfBbox(activeFeatureBufferExtended)

    const bbox4326: [number, number, number, number] = [
      activeFeatureBufferExtendedBbox[0],
      activeFeatureBufferExtendedBbox[1],
      activeFeatureBufferExtendedBbox[2],
      activeFeatureBufferExtendedBbox[3],
    ]

    humusRasterBbox.value = bbox4326

    // CRSをEPSG:4326からEPSG:3857に変換
    const minBbox3857 = proj4('EPSG:4326', 'EPSG:3857', [bbox4326[0], bbox4326[1]])
    const maxBbox3857 = proj4('EPSG:4326', 'EPSG:3857', [bbox4326[2], bbox4326[3]])
    const bbox3857: [number, number, number, number] = [
      minBbox3857[0],
      minBbox3857[1],
      maxBbox3857[0],
      maxBbox3857[1],
    ]

    const cogUrl = import.meta.env.VITE_OM_MAP_URL
    // COGファイルより腐植値を取得
    const cogSource = await extractCogHumusValues(cogUrl, bbox3857)

    // 腐植含有量平均値と標準偏差をセット
    const result = calculateHumusStats(cogSource)
    if (!result.ok) {
      humusMean.value = 0
      humusStdDev.value = 0
    } else {
      humusMean.value = result.stats.mean
      humusStdDev.value = result.stats.stdDev
    }

    // 腐植値をラスター画像に変換
    humusRaster.value = createHumusRasterImage(cogSource, activeFeatureBufferComputed.value)

    // ラスター画像として地図に追加
    addHumusRaster(mapInstance, humusRaster.value, bbox4326)

    // ポイントデータも保持（グリッド計算用）
    const humusPointGridBbox = getHumusPointGridBbox(bbox4326, cogSource)

    if (!activeFeatureBufferComputed.value) {
      notificationStore.showAlert('Error', 'ポリゴン処理に失敗しました')
      return
    }

    // 拡張ポリゴン内のポイントを抽出
    const rawPoints = turfPointsWithinPolygon(humusPointGridBbox, activeFeatureBufferExtended)

    // Point のみ抽出（MultiPointを除去）
    const filteredPoints = rawPoints.features.filter(
      (f): f is Feature<Point, { humus: number }> => f.geometry.type === 'Point',
    )

    // refに代入（VFM計算用に保持）
    humusPoint.value = {
      type: 'FeatureCollection',
      features: filteredPoints,
    }

    if (configPersistStore.humusSymbolIsVisible) {
      // 腐植値のシンボル表示
      addHumusGrid(mapInstance, humusPoint.value)
    }

    // クリックしたポリゴンのbboxの重心を算出（回転中心点）
    const centroid = turfCentroid(turfBboxPolygon(bbox4326))

    // クリックしたポリゴン形状にフィットするbboxの回転角を算出
    const vraDeg = fitRotatedBboxDeg(activeFeatureBufferComputed.value)
    gridRotationAngle.value = vraDeg

    // クリックしたポリゴンを回転
    const targetPolygonRotated = turfTransformRotate(
      activeFeatureBufferComputed.value,
      Number(vraDeg),
      {
        pivot: centroid,
      },
    )

    // グリッド生成して逆回転
    try {
      const gridResult = drawBaseMeshPolygon(
        targetPolygonRotated,
        gridEW.value,
        gridNS.value,
        gridOrigin.value,
      )
      gridCount.value = gridResult.gridCount

      const targetPolygonReRotated = turfTransformRotate(gridResult.grid, -Number(vraDeg), {
        pivot: centroid,
      })
      baseGrid.value = targetPolygonReRotated
      addBaseGrid(mapInstance, baseGrid.value)
    } catch (error) {
      if (error instanceof Error) {
        notificationStore.showAlert('Error', error.message)
      } else {
        notificationStore.showAlert('Error', '不明なエラーが発生しました')
      }
    }
  }

  return {
    loadedFeatureCollection,
    activeFeature,
    gridRotationAngle,
    gridEW,
    gridNS,
    buffer,
    gridOrigin,
    gridCount,
    humusMean,
    humusStdDev,
    baseGrid,
    humusPoint,
    humusRaster,
    humusRasterBbox,
    onClickField,
  }
}
