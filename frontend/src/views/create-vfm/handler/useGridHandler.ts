import { computed, ref, watch } from 'vue'

import { fromUrl, Pool } from 'geotiff'
import proj4 from 'proj4'
import {
  area as turfArea,
  bbox as turfBbox,
  bboxPolygon as turfBboxPolygon,
  booleanPointInPolygon as turfBooleanPointInPolygon,
  buffer as turfBuffer,
  centroid as turfCentroid,
  destination as turfDestination,
  distance as turfDistance,
  point as turfPoint,
  pointsWithinPolygon as turfPointsWithinPolygon,
  transformRotate as turfTransformRotate,
} from '@turf/turf'

import { getGeoJSONSource } from '../../common/composables/useMapSoruce'
import { addHumusGrid, addBaseGrid, addHumusRaster } from '../../common/handler/LayerHandler'
import { useErrorHandler, createGeospatialError } from '@/errors'

import { useConfigPersistStore } from '@/stores/configPersistStore'
import { useStore } from '@/stores/store'

import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import type { ReadRasterResult } from 'geotiff'
import type { MapLibreMapRef, MapLibreMouseEvent } from '@/types/map.type'
import type { HumusPointFeatureCollection, BaseGridFeatureCollection } from '@/types/vfm.type'
import type { FieldPolygonFeatureCollection, FieldPolygonFeature } from '@/types/fieldpolygon.type'

/**
 * @param map
 * @returns gridRotationAngle メッシュ回転角（°）
 * @returns gridEW メッシュ幅東西方向（m）
 * @returns gridNS メッシュ幅南北方向（m）
 * @returns buffer メッシュの外周バッファー（m）
 * @returns baseGrid
 * @returns onClickField()
 */
export function useGridHandler(map: MapLibreMapRef) {
  const configPersistStore = useConfigPersistStore()
  const store = useStore()

  const baseFeatureCollection: FieldPolygonFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  }
  const loadedFeatureCollection = ref(baseFeatureCollection)
  const activeFeature = ref<FieldPolygonFeature | null>(null)
  const gridRotationAngle = ref<number | null>(null)
  const gridEW = ref<number>(20)
  const gridNS = ref<number>(20)
  const buffer = ref<number>(0)
  const gridCount = ref<number>(0)
  const humusMean = ref<number | null>(null)
  const humusStdDev = ref<number | null>(null)
  const humusPoint = ref<HumusPointFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  })
  const humusRaster = ref<HTMLCanvasElement | undefined>()
  const humusRasterBbox = ref<[number, number, number, number]>([0, 0, 0, 0])
  const baseGrid = ref<BaseGridFeatureCollection | null>(null)

  const activeFeatureBufferComputed = computed<Feature<Polygon> | undefined>(() => {
    if (!activeFeature.value) return undefined

    const bufferMeter = buffer.value / 1000
    const result = turfBuffer(activeFeature.value, bufferMeter, {
      units: 'kilometers',
    })

    if (!result) return undefined
    return result as Feature<Polygon> // TurfはPolygonを返す
  })

  // Step2で設定する、回転角度、グリッド幅EW、グリッド幅NS、バッファーを監視
  watch([gridRotationAngle, gridEW, gridNS, buffer], (current, before) => {
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
      const turfRotated = turfTransformRotate(
        drawBaseMeshPolygon(target_polygon_rotated, gridEW.value, gridNS.value),
        -Number(gridRotationAngle.value),
        { pivot: centroid },
      )

      baseGrid.value = turfRotated

      const source = getGeoJSONSource(mapInstance, 'base-grid')

      if (!source) {
        addBaseGrid(mapInstance, baseGrid.value)
      } else {
        source.setData(baseGrid.value)
      }
    } catch (error) {
      if (error instanceof Error) {
        store.setMessage('Error', error.message)
      } else {
        store.setMessage('Error', '不明なエラーが発生しました')
      }
    }
  })

  async function onClickField(e: MapLibreMouseEvent) {
    const mapInstance = map?.value
    if (!mapInstance) return
    if (!e.features || e.features.length === 0) return

    const activeFeatureId = e.features[0].properties.id
    const filteredFeature = loadedFeatureCollection.value.features.filter(
      (f) => f.properties.id === activeFeatureId,
    )

    activeFeature.value = filteredFeature[0]

    // activeFeatureBufferComputedのundefined処理
    if (!activeFeatureBufferComputed.value) return

    // activeFeatureのバッファー処理をしたactiveFeatureBufferComputedをさらに10m拡張（境界域の外側の腐植値を取得するため）
    const activeFeatureBufferExtended = turfBuffer(activeFeatureBufferComputed.value, 0.01, {
      units: 'kilometers',
    })
    if (!activeFeatureBufferExtended) return

    // BoundingBoxを算出。
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
      store.alertMessage.alertType = 'Error'
      store.alertMessage.message = 'ポリゴン処理に失敗しました'
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
    // 回転したターゲットポリゴンに基づきメッシュ作成し元の位置に戻す
    try {
      const targetPolygonReRotated = turfTransformRotate(
        drawBaseMeshPolygon(targetPolygonRotated, gridEW.value, gridNS.value),
        -Number(vraDeg),
        { pivot: centroid },
      )
      baseGrid.value = targetPolygonReRotated
      addBaseGrid(mapInstance, baseGrid.value)
    } catch (error) {
      if (error instanceof Error) {
        store.setMessage('Error', error.message)
      } else {
        store.setMessage('Error', '不明なエラーが発生しました')
      }
    }
  }

  // クリックしたポリゴン形状にフィットするbboxの回転角を算出
  function fitRotatedBboxDeg(geom: Feature): number {
    let minDeg = 0
    let minArea = 0

    const centroid = turfCentroid(turfBboxPolygon(turfBbox(geom)))

    for (let deg = 0; deg <= 90; deg++) {
      // クリックしたポリゴンを回転
      const rotatedTargetPolygon = turfTransformRotate(geom, deg, { pivot: centroid })

      // 回転したポリゴンのBoundingBoxの座標およびポリゴンを取得
      const rotatedTargetPolygonBbox = turfBbox(rotatedTargetPolygon)
      const rotatedTargetPolygonBboxPolygon: Feature = turfBboxPolygon(rotatedTargetPolygonBbox)

      if (deg === 0) {
        minArea = turfArea(rotatedTargetPolygonBboxPolygon)
      } else {
        if (minArea > turfArea(rotatedTargetPolygonBboxPolygon)) {
          minDeg = deg
          minArea = turfArea(rotatedTargetPolygonBboxPolygon)
        }
      }
    }

    return minDeg
  }

  function drawBaseMeshPolygon(
    field_feature: Feature,
    gridEW: number,
    gridNS: number,
  ): FeatureCollection<Polygon, { area: number }> {
    const effectiveGridEW = Math.max(gridEW, 10)
    const effectiveGridNS = Math.max(gridNS, 10)

    const field_feature_bbox = turfBbox(field_feature)

    const bbox_NW_coords = [field_feature_bbox[0], field_feature_bbox[3]]
    const bbox_NE_coords = [field_feature_bbox[2], field_feature_bbox[3]]
    // const bbox_SE_coords = [field_feature_bbox[2], field_feature_bbox[1]]
    const bbox_SW_coords = [field_feature_bbox[0], field_feature_bbox[1]]

    // bbox横方向（横幅）の行数
    const bbox_columns = Math.ceil(
      (turfDistance(
        turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]]),
        turfPoint([bbox_NE_coords[0], bbox_NE_coords[1]]),
        { units: 'kilometers' },
      ) *
        1000) /
        effectiveGridEW,
    )
    // bbox縦方向（奥行き）の列数
    const bbox_rows = Math.ceil(
      (turfDistance(
        turfPoint([bbox_SW_coords[0], bbox_SW_coords[1]]),
        turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]]),
        { units: 'kilometers' },
      ) *
        1000) /
        effectiveGridNS,
    )

    gridCount.value = bbox_rows * bbox_columns

    if (gridCount.value >= 1000 && gridCount.value <= 2000) {
      store.setMessage('Warn', 'グリッドが細かいので、グリッド幅を広げることを検討して下さい。')
    } else if (gridCount.value > 2000) {
      throw new Error(
        'グリッドが細かすぎるので、作成面積を小さくする・グリッド幅を広げる等してください。',
      )
    }

    let current_point_feature = turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]])
    const grid_feature_collection = []
    let NW_coords
    let SW_coords
    let NE_coords
    let SE_coords

    for (let lat_count = 1; lat_count <= bbox_rows; lat_count++) {
      for (let lng_count = 1; lng_count <= bbox_columns; lng_count++) {
        NW_coords = current_point_feature.geometry.coordinates

        if (lat_count < bbox_rows) {
          SW_coords = turfDestination(current_point_feature, gridNS / 1000, 180, {
            units: 'kilometers',
          }).geometry.coordinates
        } else {
          SW_coords = turfPoint([NW_coords[0], bbox_SW_coords[1]]).geometry.coordinates
        }

        if (lng_count !== bbox_columns) {
          NE_coords = turfDestination(current_point_feature, effectiveGridEW / 1000, 90, {
            units: 'kilometers',
          }).geometry.coordinates
          SE_coords = turfDestination(turfPoint(SW_coords), effectiveGridEW / 1000, 90, {
            units: 'kilometers',
          }).geometry.coordinates
        } else {
          NE_coords = turfPoint([bbox_NE_coords[0], current_point_feature.geometry.coordinates[1]])
            .geometry.coordinates
          SE_coords = turfPoint([bbox_NE_coords[0], SW_coords[1]]).geometry.coordinates
        }

        // 単位ポリゴンを作成（頂点は反時計回り）
        const mesh_feature: Feature<Polygon, { area: number }> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[SW_coords, SE_coords, NE_coords, NW_coords, SW_coords]],
          },
          properties: {
            area: 0,
          },
        }

        // areaプロパティを付与
        mesh_feature.properties.area = turfArea(mesh_feature)

        grid_feature_collection.push(mesh_feature)

        if (lng_count !== bbox_columns) {
          current_point_feature = turfPoint(NE_coords)
        } else {
          current_point_feature = turfPoint([bbox_NW_coords[0], SW_coords[1]])
        }
      }
    }

    return { type: 'FeatureCollection', features: grid_feature_collection }
  }

  async function extractCogSource(
    url: string,
    bbox3857: [number, number, number, number],
  ): Promise<ReadRasterResult> {
    const { handleError } = useErrorHandler()
    const pool = new Pool()

    try {
      const tiff = await fromUrl(url)
      const cogSource = await tiff.readRasters({
        bbox: bbox3857,
        samples: [0], // 取得するバンドを指定
        interleave: true,
        pool,
      }) // 戻り値の型はCOGソースに依存する。腐植マップの場合はUnit8Array

      return cogSource
    } catch (error) {
      // エラーの詳細情報を収集
      const isError = error instanceof Error
      const errorDetails = {
        userAgent: navigator.userAgent,
        cogUrl: url,
        bbox: bbox3857,
        errorType: isError ? error.constructor.name : typeof error,
        errorMessage: isError ? error.message : String(error),
        aggregateErrors:
          isError && 'errors' in error && Array.isArray(error.errors)
            ? error.errors.map((e: Error) => ({
                type: e?.constructor?.name || 'Unknown',
                message: e?.message || 'No message',
                stack: e?.stack || 'No stack trace',
              }))
            : undefined,
        timestamp: new Date().toISOString(),
      }

      // エラーハンドラーを使用してユーザーに通知
      const appError = createGeospatialError(
        `COGデータ読み込み: ${isError ? error.message : String(error)}`,
        isError ? error : new Error(String(error)),
        errorDetails,
      )
      handleError(appError)

      try {
        const tiff = await fromUrl(url)
        const cogSource = await tiff.readRasters({
          bbox: bbox3857,
          samples: [0],
          interleave: true,
          // poolを指定しない
        })
        return cogSource
      } catch (retryError) {
        // リトライも失敗した場合
        const isRetryError = retryError instanceof Error
        const retryAppError = createGeospatialError(
          `COGデータ読み込み再試行失敗: ${isRetryError ? retryError.message : String(retryError)}`,
          isRetryError ? retryError : new Error(String(retryError)),
          { ...errorDetails, retry: true },
        )
        handleError(retryAppError)
        throw retryError // エラーを上位に伝播
      }
    } finally {
      // 最終的にPoolを破棄
      // Poolが存在しない場合もあるため、条件を追加
      if (pool && 'destroy' in pool && typeof pool.destroy === 'function') {
        pool.destroy()
      }
    }
  }

  async function extractCogHumusValues(
    url: string,
    bbox3857: [number, number, number, number],
  ): Promise<ReadRasterResult> {
    return await extractCogSource(url, bbox3857)
  }

  function getHumusPointGridBbox(
    bbox: [number, number, number, number],
    cogSource: ReadRasterResult,
  ): HumusPointFeatureCollection {
    const data = toNumericValues(cogSource)
    if (!data) throw new Error('Invalid raster data')

    const bboxMinLng = bbox[0]
    const bboxMinLat = bbox[1]
    const bboxMaxLng = bbox[2]
    const bboxMaxLat = bbox[3]
    let cogSourcePosition = 0
    const point_mesh_feature_collection = []

    const deltaLat = (bboxMaxLat - bboxMinLat) / cogSource.height
    const deltaLng = (bboxMaxLng - bboxMinLng) / cogSource.width

    for (let gridNS_cnt = 0; gridNS_cnt < cogSource.height; gridNS_cnt++) {
      const lat = bboxMaxLat - deltaLat * (gridNS_cnt + 0.5)

      for (let gridEW_cnt = 0; gridEW_cnt < cogSource.width; gridEW_cnt++) {
        const lng = bboxMinLng + deltaLng * (gridEW_cnt + 0.5)
        const humus = Number(cogSource[cogSourcePosition] ?? 0)

        point_mesh_feature_collection.push({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat] as [number, number],
          },
          properties: { humus },
        })

        cogSourcePosition++
      }
    }
    const featureCollection: FeatureCollection<Point, { humus: number }> = {
      type: 'FeatureCollection',
      features: point_mesh_feature_collection,
    }
    return featureCollection
  }

  function createHumusRasterImage(
    cogSource: ReadRasterResult,
    polygon: Feature<Polygon>,
  ): HTMLCanvasElement {
    const bbox4326 = turfBbox(polygon)

    // キャンバスを作成
    const canvas = document.createElement('canvas')
    canvas.width = cogSource.width
    canvas.height = cogSource.height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context creation failed')
    }

    // ImageDataを作成
    const imageData = ctx.createImageData(cogSource.width, cogSource.height)
    const data = imageData.data

    // カラーマッピング関数（既存の色スケールを使用）
    const getColorForHumus = (humus: number): [number, number, number] => {
      // 腐植値に基づいて色を補間
      if (humus <= 0) return [215, 25, 28] // #d7191c
      if (humus <= 25) {
        const t = humus / 25
        return [
          Math.round(215 + (240 - 215) * t),
          Math.round(25 + (124 - 25) * t),
          Math.round(28 + (74 - 28) * t),
        ]
      }
      if (humus <= 50) {
        const t = (humus - 25) / 25
        return [
          Math.round(240 + (254 - 240) * t),
          Math.round(124 + (201 - 124) * t),
          Math.round(74 + (128 - 74) * t),
        ]
      }
      if (humus <= 75) {
        const t = (humus - 50) / 25
        return [
          Math.round(254 + (255 - 254) * t),
          Math.round(201 + (255 - 201) * t),
          Math.round(128 + (191 - 128) * t),
        ]
      }
      if (humus <= 100) {
        const t = (humus - 75) / 25
        return [
          Math.round(255 + (199 - 255) * t),
          Math.round(255 + (232 - 255) * t),
          Math.round(191 + (173 - 191) * t),
        ]
      }
      if (humus <= 125) {
        const t = (humus - 100) / 25
        return [
          Math.round(199 + (128 - 199) * t),
          Math.round(232 + (191 - 232) * t),
          Math.round(173 + (171 - 173) * t),
        ]
      }
      if (humus <= 150) {
        const t = (humus - 125) / 25
        return [
          Math.round(128 + (43 - 128) * t),
          Math.round(191 + (131 - 191) * t),
          Math.round(171 + (186 - 171) * t),
        ]
      }
      return [43, 131, 186] // #2b83ba
    }

    // バウンディングボックスの範囲を取得
    const bboxMinLng = bbox4326[0]
    const bboxMinLat = bbox4326[1]
    const bboxMaxLng = bbox4326[2]
    const bboxMaxLat = bbox4326[3]

    // COGデータをImageDataに変換
    let cogSourcePosition = 0
    for (let y = 0; y < cogSource.height; y++) {
      for (let x = 0; x < cogSource.width; x++) {
        // ピクセルの地理座標を計算
        const lng = bboxMinLng + (x / (cogSource.width - 1)) * (bboxMaxLng - bboxMinLng)
        const lat = bboxMaxLat - (y / (cogSource.height - 1)) * (bboxMaxLat - bboxMinLat)

        // ポイントがポリゴン内にあるかチェック
        const pointFeature = turfPoint([lng, lat])
        const isInsidePolygon = turfBooleanPointInPolygon(pointFeature, polygon)

        const pixelIndex = (y * cogSource.width + x) * 4

        if (isInsidePolygon) {
          // ポリゴン内の場合は腐植値に基づいて色を設定
          const humus = Number(cogSource[cogSourcePosition] ?? 0)
          const [r, g, b] = getColorForHumus(humus)
          // 腐植値が0の場合は透明にする
          const opacity = humus === 0 ? 0 : 1

          data[pixelIndex] = r
          data[pixelIndex + 1] = g
          data[pixelIndex + 2] = b
          data[pixelIndex + 3] = 255 * opacity
        } else {
          // ポリゴン外の場合は完全に透明
          data[pixelIndex] = 0
          data[pixelIndex + 1] = 0
          data[pixelIndex + 2] = 0
          data[pixelIndex + 3] = 0
        }

        cogSourcePosition++
      }
    }

    // ImageDataをキャンバスに描画
    ctx.putImageData(imageData, 0, 0)

    return canvas
  }

  type HumusStats = { mean: number; stdDev: number }

  type HumusStatsResult =
    | { ok: true; stats: HumusStats }
    | { ok: false; reason: 'NO_VALID_VALUES' | 'NOT_FINITE' }

  type NumericArrayLike = ArrayLike<number> // TypedArrayもOK

  function isNumericArrayLike(x: unknown): x is NumericArrayLike {
    return ArrayBuffer.isView(x) && !(x instanceof DataView)
  }

  function toNumericValues(input: ReadRasterResult): NumericArrayLike | null {
    // バンド配列なら先頭を使う（samples:[0]なら通常これでOK）
    if (Array.isArray(input)) {
      const band0 = input[0]
      return isNumericArrayLike(band0) ? (band0 as NumericArrayLike) : null
    }
    // 単一バンド（TypedArray & Dimensions など）
    return isNumericArrayLike(input) ? (input as NumericArrayLike) : null
  }

  function calculateHumusStats(values: ReadRasterResult): HumusStatsResult {
    const arr = toNumericValues(values)
    if (!arr || arr.length === 0) {
      return { ok: false, reason: 'NO_VALID_VALUES' }
    }

    let count = 0
    let sum = 0
    let sumSq = 0

    for (let i = 0; i < arr.length; i++) {
      const v = arr[i]
      if (v === 0 || !Number.isFinite(v)) continue
      count++
      sum += v
      sumSq += v * v
    }

    if (count === 0) {
      return { ok: false, reason: 'NO_VALID_VALUES' }
    }

    const mean = sum / count
    const variance = sumSq / count - mean * mean

    if (!Number.isFinite(mean) || variance < 0) {
      return { ok: false, reason: 'NOT_FINITE' }
    }

    const stdDev = Math.sqrt(variance)

    if (!Number.isFinite(stdDev)) {
      return { ok: false, reason: 'NOT_FINITE' }
    }

    return {
      ok: true,
      stats: { mean: Math.round(mean), stdDev: Math.round(stdDev) },
    }
  }

  return {
    loadedFeatureCollection,
    activeFeature,
    gridRotationAngle,
    gridEW,
    gridNS,
    buffer,
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
