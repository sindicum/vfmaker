import { ref } from 'vue'
import type { MapLibreMapRef, DrawRef } from '@/types/map.type'
import { logger } from '@/utils/logger'

const LONG_PRESS_DURATION = 650 // 長押し判定時間（ms）
const MOVE_THRESHOLD = 5 // 移動許容範囲（px）

// タッチ判定半径（スマホでの操作性向上のため）
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
const TOUCH_RADIUS = isTouchDevice ? 25 : 15 // スマホ: 25px, PC: 15px

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
        // 長押し検出時はpointerupをキャンセルしないで、クリックを発生させ頂点削除を実行
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

  /**
   * 2点間の距離を計算
   */
  function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  function executeVertexDeletion(e: PointerEvent) {
    const mapInstance = map?.value
    const drawInstance = draw?.value
    if (!mapInstance || !drawInstance) return

    // クリック位置の座標を取得
    const rect = mapInstance.getCanvas().getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // タップ位置を中心とした矩形領域で頂点を検索（スマホ対応）
    const bbox: [[number, number], [number, number]] = [
      [x - TOUCH_RADIUS, y - TOUCH_RADIUS],
      [x + TOUCH_RADIUS, y + TOUCH_RADIUS],
    ]
    const features = mapInstance.queryRenderedFeatures(bbox, {
      layers: ['td-point'], // 頂点レイヤーのみ検索
    })

    logger.debug('=== 長押し検出 ===')
    logger.debug('タップ位置:', { x, y }, 'タッチ半径:', TOUCH_RADIUS)
    logger.debug('検出されたフィーチャー数:', features.length)

    // td-pointレイヤーの頂点のみをフィルタリング
    const vertexFeatures = features.filter((f) => f.layer.id === 'td-point')

    if (vertexFeatures.length === 0) {
      logger.debug('頂点が見つかりませんでした')
      isPressing.value = false
      pressStartPoint.value = null
      return
    }

    // 複数の頂点が見つかった場合は、タップ位置に最も近い頂点を選択
    const vertexFeature = vertexFeatures.reduce((closest, current) => {
      // Point型であることを確認（td-pointレイヤーは常にPoint型）
      if (current.geometry.type !== 'Point' || closest.geometry.type !== 'Point') {
        return closest
      }

      // フィーチャーのピクセル座標を取得
      const currentPoint = mapInstance.project([
        current.geometry.coordinates[0],
        current.geometry.coordinates[1],
      ])
      const closestPoint = mapInstance.project([
        closest.geometry.coordinates[0],
        closest.geometry.coordinates[1],
      ])

      const currentDist = getDistance(x, y, currentPoint.x, currentPoint.y)
      const closestDist = getDistance(x, y, closestPoint.x, closestPoint.y)

      logger.debug('頂点距離比較:', {
        current: { id: current.id, dist: currentDist.toFixed(2) },
        closest: { id: closest.id, dist: closestDist.toFixed(2) },
      })

      return currentDist < closestDist ? current : closest
    })

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
            // 対象頂点の緯度経度およびコンテナ座標を取得
            const lng = coordinates[vertexIndex][0]
            const lat = coordinates[vertexIndex][1]
            const containerX = mapInstance.project([lng, lat]).x
            const containerY = mapInstance.project([lng, lat]).y

            // TODO: TerraDrawSelectModeのprivateメソッドのため、今後のアップデートで動作しなくなる可能性があり要見直し
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyDraw = drawInstance as any
            const selectMode = anyDraw._modes?.['select']

            if (!selectMode || typeof selectMode.onClick !== 'function') {
              console.warn('TerraDraw select mode is not available or onClick is missing')
            }

            // TerraDrawの内部関数を利用して右クリックイベントをシミュレートし頂点削除を実行
            selectMode.onClick({
              lng: lng,
              lat: lat,
              containerX: containerX,
              containerY: containerY,
              button: 'right',
              heldKeys: [],
              isContextMenu: false,
            })

            logger.debug('頂点を削除しました（長押しを右クリックに変換）')
          } else {
            logger.debug('これ以上頂点を削除できません（最小3頂点が必要）')
          }
        } else {
          logger.debug('フィーチャーが見つからないか、Polygon型ではありません')
        }
      } else {
        logger.debug('頂点情報が不完全です')
      }
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
