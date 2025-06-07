import { computed, ref, watch } from 'vue'
import { usePersistStore } from '@/stores/store'
import { useStore } from '@/stores/store'

import { Pool, fromUrl } from 'geotiff'
import proj4 from 'proj4'
import {
  area as turfArea,
  bbox as turfBbox,
  bboxPolygon as turfBboxPolygon,
  buffer as turfBuffer,
  centroid as turfCentroid,
  destination as turfDestination,
  distance as turfDistance,
  point as turfPoint,
  pointsWithinPolygon as turfPointsWithinPolygon,
  transformRotate as turfTransformRotate,
} from '@turf/turf'

import { addHumusGrid, addBaseMesh } from './LayerHandler'

import type { MapMouseEvent, GeoJSONSource, MaplibreRef } from '@/types/maplibre'
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import type { ReadRasterResult } from 'geotiff'
import type { AreaPolygon, BaseGrid, HumusPoints } from '@/types/geom'

/**
 * @param map
 * @returns gridRotationAngle メッシュ回転角（°）
 * @returns gridEW メッシュ幅東西方向（m）
 * @returns gridNS メッシュ幅南北方向（m）
 * @returns buffer メッシュの外周バッファー（m）
 * @returns baseMesh
 * @returns onClickField()
 */
export function useGridHandler(map: MaplibreRef) {
  const persistStore = usePersistStore()
  const store = useStore()

  const gridRotationAngle = ref<number | null>(null)
  const gridEW = ref<number>(20)
  const gridNS = ref<number>(20)
  const buffer = ref<number>(0)
  const humusPoint = ref<HumusPoints>({
    type: 'FeatureCollection',
    features: [],
  })

  const baseMesh = ref<BaseGrid>({
    type: 'FeatureCollection',
    features: [] as AreaPolygon[],
  })

  const activeFeature = ref<Feature<Polygon, { id: string }>>()

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
    const currentMap = map?.value
    const beforeGridRotationAngle = before[0]

    // gridRotationAngleの更新前がnullだったら処理中断
    if (beforeGridRotationAngle === null) {
      return
    }

    if (activeFeatureBufferComputed.value && currentMap) {
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
      const turfRotated = turfTransformRotate(
        drawBaseMeshPolygon(target_polygon_rotated, gridEW.value, gridNS.value),
        -Number(gridRotationAngle.value),
        { pivot: centroid },
      )

      baseMesh.value = turfRotated
      const sourceData = currentMap.getSource('base-mesh') as GeoJSONSource
      if (sourceData) {
        sourceData.setData(baseMesh.value)
      }
    }
  })

  async function onClickField(e: MapMouseEvent) {
    if (!e.features || e.features.length === 0) return

    const currentMap = map?.value

    if (currentMap) {
      const clickedPolygonId = e.features[0].id
      const selectedFeature = persistStore.featurecollection.features.filter((feature) => {
        if (feature.properties) {
          return feature.properties.id === clickedPolygonId
        } else {
          // feature.propertiesがnullの際にはfeatureを返す
          return feature
        }
      })
      activeFeature.value = selectedFeature[0]

      // activeFeatureBufferComputedのundefined処理
      if (!activeFeatureBufferComputed.value) return

      // BoundingBoxを算出。activeFeatureBufferComputedはactiveFeatureに基づきcompute（注意）
      const activeFeatureBufferComputedBbox = turfBbox(activeFeatureBufferComputed.value)

      const bbox4326: [number, number, number, number] = [
        activeFeatureBufferComputedBbox[0],
        activeFeatureBufferComputedBbox[1],
        activeFeatureBufferComputedBbox[2],
        activeFeatureBufferComputedBbox[3],
      ]

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
      const cogSource = await extractCogSource(cogUrl, bbox3857)
      // 腐植値をポイントグリッドに変換
      const humusPointGridBbox = getHumusPointGridBbox(bbox4326, cogSource)

      // バッファー処理後のポリゴンを5mだけ拡張（ポイントの抽出漏れをなくすため）
      const extendedActiveFeature = turfBuffer(activeFeatureBufferComputed.value, 0.005, {
        units: 'kilometers',
      })

      if (!extendedActiveFeature) {
        store.alertMessage.alertType = 'Error'
        store.alertMessage.message = 'ポリゴン処理に失敗しました'
        return
      }

      // 拡張ポリゴン内のポイントを抽出
      const rawPoints = turfPointsWithinPolygon(humusPointGridBbox, extendedActiveFeature)
      // Point のみ抽出（MultiPointを除去）
      const filteredPoints = rawPoints.features.filter(
        (f): f is Feature<Point, { humus: number }> => f.geometry.type === 'Point',
      )

      // refに代入
      humusPoint.value = {
        type: 'FeatureCollection',
        features: filteredPoints,
      }

      addHumusGrid(currentMap, humusPoint.value)

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
      const targetPolygonReRotated = turfTransformRotate(
        drawBaseMeshPolygon(targetPolygonRotated, gridEW.value, gridNS.value),
        -Number(vraDeg),
        { pivot: centroid },
      )

      baseMesh.value = targetPolygonReRotated

      addBaseMesh(currentMap, baseMesh.value)
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
    const bbox_columns = Math.floor(
      (turfDistance(
        turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]]),
        turfPoint([bbox_NE_coords[0], bbox_NE_coords[1]]),
        { units: 'kilometers' },
      ) *
        1000) /
        effectiveGridEW,
    )
    // bbox縦方向（奥行き）の列数
    const bbox_rows = Math.floor(
      (turfDistance(
        turfPoint([bbox_SW_coords[0], bbox_SW_coords[1]]),
        turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]]),
        { units: 'kilometers' },
      ) *
        1000) /
        effectiveGridNS,
    )

    let current_point_feature = turfPoint([bbox_NW_coords[0], bbox_NW_coords[1]])
    const grid_feature_collection = []
    let NW_coords
    let SW_coords
    let NE_coords
    let SE_coords

    for (let lat_count = 0; lat_count <= bbox_rows; lat_count++) {
      for (let lng_count = 0; lng_count <= bbox_columns; lng_count++) {
        NW_coords = current_point_feature.geometry.coordinates
        if (lat_count !== bbox_rows) {
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

        const mesh_feature: Feature<Polygon, { area: number }> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[NW_coords, NE_coords, SE_coords, SW_coords, NW_coords]],
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
    bbox: [number, number, number, number],
  ): Promise<ReadRasterResult> {
    const tiff = await fromUrl(url)
    const pool = new Pool()
    const cogSource = await tiff.readRasters({
      bbox,
      samples: [0], // 取得するバンドを指定
      interleave: true,
      pool,
    }) // 戻り値の型はCOGソースに依存する。腐植マップの場合はUnit8Array
    return cogSource
  }

  function getHumusPointGridBbox(
    bbox: [number, number, number, number],
    cogSource: ReadRasterResult,
  ): FeatureCollection<Point, { humus: number }> {
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

  return {
    activeFeature,
    gridRotationAngle,
    gridEW,
    gridNS,
    buffer,
    baseMesh,
    humusPoint,
    onClickField,
  }
}
