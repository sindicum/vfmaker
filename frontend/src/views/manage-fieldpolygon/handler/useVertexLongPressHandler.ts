import { ref } from 'vue'
import type { MapLibreMapRef, DrawRef } from '@/types/map.type'
import { logger } from '@/utils/logger'
import { COORDINATE_PRECISION } from './LayerHandler'

const LONG_PRESS_DURATION = 800 // 長押し判定時間（ms）
const MOVE_THRESHOLD = 5 // 移動許容範囲（px）

// 頂点フィーチャーのプロパティ型定義
interface VertexFeatureProperties {
  selectionPointFeatureId: string
  index: number
}

export function useVertexLongPressHandler(map: MapLibreMapRef, draw: DrawRef) {
  const longPressTimer = ref<number | null>(null)
  const pressStartPoint = ref<{ x: number; y: number } | null>(null)
  const isPressing = ref(false)

  function onVertexLongPress() {
    const mapInstance = map?.value
    if (!mapInstance) return

    console.log('getCanvas', mapInstance.getCanvas())
    // イベントリスナーを登録
    mapInstance.getCanvas().addEventListener('pointerdown', handlePointerDown)
    mapInstance.getCanvas().addEventListener('pointermove', handlePointerMove)
    mapInstance.getCanvas().addEventListener('pointerup', handlePointerUp)
    mapInstance.getCanvas().addEventListener('pointercancel', handlePointerCancel)
  }

  function offVertexLongPress() {
    const mapInstance = map?.value
    if (!mapInstance) return

    // イベントリスナーを解除
    mapInstance.getCanvas().removeEventListener('pointerdown', handlePointerDown)
    mapInstance.getCanvas().removeEventListener('pointermove', handlePointerMove)
    mapInstance.getCanvas().removeEventListener('pointerup', handlePointerUp)
    mapInstance.getCanvas().removeEventListener('pointercancel', handlePointerCancel)

    // タイマーをクリア
    clearLongPressTimer()
  }

  function handlePointerDown(e: PointerEvent) {
    const mapInstance = map?.value
    const drawInstance = draw?.value
    if (!mapInstance || !drawInstance) return

    // selectモードでない場合は処理しない
    if (drawInstance.getMode() !== 'select') return

    // 押下位置を記録
    pressStartPoint.value = { x: e.clientX, y: e.clientY }
    isPressing.value = true

    // 長押しタイマーを開始
    longPressTimer.value = window.setTimeout(() => {
      if (isPressing.value) {
        // 長押し検出時はpointerupをキャンセルしないで、クリックを発生させる
        executeVertexDeletion(e)
      }
    }, LONG_PRESS_DURATION)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isPressing.value || !pressStartPoint.value) return

    // 移動距離を計算
    const deltaX = Math.abs(e.clientX - pressStartPoint.value.x)
    const deltaY = Math.abs(e.clientY - pressStartPoint.value.y)

    // しきい値を超えた移動があればキャンセル
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      clearLongPressTimer()
      isPressing.value = false
    }
  }

  function handlePointerUp() {
    // 長押し完了前にリリースされた場合はキャンセル
    clearLongPressTimer()
    isPressing.value = false
    pressStartPoint.value = null
  }

  function handlePointerCancel() {
    // ポインターイベントがキャンセルされた場合
    clearLongPressTimer()
    isPressing.value = false
    pressStartPoint.value = null
  }

  function clearLongPressTimer() {
    if (longPressTimer.value !== null) {
      window.clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }
  }

  function executeVertexDeletion(e: PointerEvent) {
    const mapInstance = map?.value
    const drawInstance = draw?.value
    if (!mapInstance || !drawInstance) return

    // クリック位置の座標を取得
    const rect = mapInstance.getCanvas().getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Terra Drawの頂点レイヤーを検出
    const features = mapInstance.queryRenderedFeatures([x, y])
    console.log('長押し検出で取得したフィーチャー!!!:', features)

    logger.debug('=== 長押し検出 ===')
    logger.debug('検出されたフィーチャー数:', features.length)
    features.forEach((feature, index) => {
      logger.debug(`Feature ${index}:`, {
        layerId: feature.layer.id,
        layerType: feature.layer.type,
        sourceId: feature.source,
        properties: feature.properties,
      })
    })

    // td-pointレイヤー（頂点）が検出された場合のみ処理
    const vertexFeature = features.find((f) => f.layer.id === 'td-point')

    if (vertexFeature && vertexFeature.properties) {
      logger.debug('頂点を検出しました。削除処理を開始...')
      logger.debug('頂点プロパティ:', vertexFeature.properties)

      // 型安全なプロパティ取得
      const props = vertexFeature.properties as Partial<VertexFeatureProperties>
      const featureId = props.selectionPointFeatureId
      const vertexIndex = props.index

      if (featureId && vertexIndex !== undefined) {
        logger.debug('フィーチャーID:', featureId, '頂点インデックス:', vertexIndex)

        // フィーチャーを取得
        const feature = drawInstance.getSnapshotFeature(featureId)

        if (feature && feature.geometry.type === 'Polygon') {
          const coordinates = feature.geometry.coordinates[0]
          logger.debug('現在の座標数:', coordinates.length)

          // ポリゴンは最低4点必要（3頂点+閉じる点）なので、5点以上ある場合のみ削除
          if (coordinates.length > 4) {
            // 頂点を削除（インデックス指定）し、座標精度を保証
            const newCoordinates = coordinates
              .filter((_: number[], index: number) => index !== vertexIndex)
              .map((coord: number[]) => [
                parseFloat(coord[0].toFixed(COORDINATE_PRECISION)),
                parseFloat(coord[1].toFixed(COORDINATE_PRECISION)),
              ])

            // 最初と最後の座標が同じでない場合は修正（ポリゴンを閉じる）
            if (
              newCoordinates[0][0] !== newCoordinates[newCoordinates.length - 1][0] ||
              newCoordinates[0][1] !== newCoordinates[newCoordinates.length - 1][1]
            ) {
              newCoordinates.push([...newCoordinates[0]])
            }

            // 新しいジオメトリを作成
            const updatedFeature = {
              ...feature,
              geometry: {
                ...feature.geometry,
                coordinates: [newCoordinates],
              },
            }

            logger.debug('頂点削除後の座標数:', newCoordinates.length)

            // フィーチャーを更新
            drawInstance.removeFeatures([featureId])
            const result = drawInstance.addFeatures([updatedFeature])
            logger.debug('追加結果:', result)

            // selectモードに戻して再選択
            drawInstance.setMode('select')
            drawInstance.selectFeature(featureId)

            logger.debug('頂点を削除しました（長押し）')
          } else {
            logger.debug('これ以上頂点を削除できません（最小3頂点が必要）')
          }
        } else {
          logger.debug('フィーチャーが見つからないか、Polygon型ではありません')
        }
      } else {
        logger.debug('頂点情報が不完全です')
      }
    } else {
      logger.debug(
        '頂点が見つかりませんでした。検出されたレイヤー:',
        features.map((f) => f.layer.id),
      )
    }

    // 状態をリセット
    isPressing.value = false
    pressStartPoint.value = null
  }

  return {
    onVertexLongPress,
    offVertexLongPress,
  }
}
