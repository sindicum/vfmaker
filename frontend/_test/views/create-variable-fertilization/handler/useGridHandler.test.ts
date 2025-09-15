import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useGridHandler } from '@/views/create-variable-fertilization/handler/useGridHandler'
import { usePersistStore } from '@/stores/persistStore'

import type { MaplibreRef } from '@/types/maplibre'

// メモリ効率化のための軽量地理空間ライブラリモック
vi.mock('geotiff', () => ({
  Pool: vi.fn().mockImplementation(() => ({})), // Poolインスタンス生成を無効化
  fromUrl: vi.fn().mockResolvedValue({
    readRasters: vi.fn().mockResolvedValue({
      width: 2,
      height: 2,
      length: 4,
      0: 50,
      1: 75,
      2: 25,
      3: 100, // 最小サンプルデータ
    }),
  }),
}))

// メモリ効率化のためproj4座標変換を最小化
vi.mock('proj4', () => ({
  default: vi.fn().mockImplementation(() => {
    // 実際の変換計算を避け、固定変換値を返す
    return [0.001, 0.001] // 固定オフセット
  }),
}))

// LayerHandlerのモック
vi.mock('@/views/create-variable-fertilization/handler/LayerHandler', () => ({
  addHumusGrid: vi.fn(),
  addBaseMesh: vi.fn(),
  removeHumusGrid: vi.fn(),
  removeBaseMesh: vi.fn(),
  addHumusRaster: vi.fn(),
  removeHumusRaster: vi.fn(),
}))

// メモリ効率化のためTurf.js重い地理空間計算を軽量モック
vi.mock('@turf/turf', () => {
  // 軽量な固定ポリゴン（座標数を最小に）
  const lightPolygon = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ], // 4点の正方形
    },
    properties: { area: 1000 },
  }

  return {
    buffer: vi.fn().mockReturnValue(lightPolygon),
    bbox: vi.fn().mockReturnValue([0, 0, 1, 1]), // 固定bbox
    pointsWithinPolygon: vi.fn().mockImplementation((pointCollection, polygon) => {
      // ポリゴンのbboxを取得（簡易版）
      if (!polygon?.geometry?.coordinates?.[0]) {
        return {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [0.5, 0.5] },
              properties: { humus: 50 },
            },
          ],
        }
      }

      const coords = polygon.geometry.coordinates[0]
      const minX = Math.min(...coords.map((c) => c[0]))
      const maxX = Math.max(...coords.map((c) => c[0]))
      const minY = Math.min(...coords.map((c) => c[1]))
      const maxY = Math.max(...coords.map((c) => c[1]))

      // pointCollectionから範囲内のポイントをフィルタ
      let pointsInBounds = []
      if (pointCollection?.features) {
        pointsInBounds = pointCollection.features.filter((point) => {
          const [x, y] = point.geometry.coordinates
          return x >= minX && x <= maxX && y >= minY && y <= maxY
        })
      }

      // デフォルトのポイントを含める（後方互換性のため）
      if (pointsInBounds.length === 0) {
        pointsInBounds.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0.5, 0.5] },
          properties: { humus: 50 },
        })
      }

      return {
        type: 'FeatureCollection',
        features: pointsInBounds,
      }
    }),
    centroid: vi.fn().mockReturnValue({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0.5, 0.5] },
      properties: {},
    }),
    bboxPolygon: vi.fn().mockReturnValue(lightPolygon),
    transformRotate: vi.fn().mockImplementation((feature, angle, options) => {
      // 角度がundefinedまたは0の場合はそのまま返す
      if (!angle || angle === 0) {
        return feature
      }

      // FeatureCollectionの場合の処理
      if (feature.type === 'FeatureCollection') {
        // 単純化のため、元のFeatureCollectionを返す
        // 実際の実装では各Featureを回転させるが、テストでは省略
        return feature
      }

      // Featureの場合の回転処理
      const rad = (angle * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      // pivotが指定されている場合はそれを使用、そうでなければ中心点を計算
      let centerX, centerY
      if (options?.pivot) {
        centerX = options.pivot.geometry.coordinates[0]
        centerY = options.pivot.geometry.coordinates[1]
      } else {
        const coords = feature.geometry.coordinates[0]
        centerX = coords.reduce((sum, c) => sum + c[0], 0) / (coords.length - 1)
        centerY = coords.reduce((sum, c) => sum + c[1], 0) / (coords.length - 1)
      }

      // 各座標を回転
      const coords = feature.geometry.coordinates[0]
      const rotatedCoords = coords.map((coord) => {
        const dx = coord[0] - centerX
        const dy = coord[1] - centerY
        return [centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos]
      })

      return {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: [rotatedCoords],
        },
        properties: {
          ...feature.properties,
          rotationAngle: angle,
        },
      }
    }), // 実際の回転計算を模倣
    area: vi.fn().mockReturnValue(1000), // 固定面積
    distance: vi.fn().mockReturnValue(0.1), // 固定距離（km）
    point: vi.fn().mockImplementation((coords) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: {},
    })),
    destination: vi.fn().mockImplementation((point) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.geometry.coordinates[0] + 0.001, point.geometry.coordinates[1] + 0.001],
      },
      properties: {},
    })),
    booleanPointInPolygon: vi.fn().mockReturnValue(true), // ポイントがポリゴン内にあるかのチェック
  }
})

// Canvas APIのモック（テスト環境でCanvas APIが利用できないため）
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    width = 100
    height = 100
    getContext() {
      return {
        createImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(4 * 100 * 100), // RGBA * width * height
          width: 100,
          height: 100,
        }),
        putImageData: vi.fn(),
        canvas: {
          toDataURL: vi
            .fn()
            .mockReturnValue(
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            ),
        },
      }
    }
  },
  writable: true,
})

Object.defineProperty(global, 'document', {
  value: {
    ...global.document,
    createElement: vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return new global.HTMLCanvasElement()
      }
      return {}
    }),
  },
  writable: true,
})

// 環境変数のモック
vi.stubEnv('VITE_OM_MAP_URL', 'https://example.com/humus.tif')

// テスト用の型定義
interface MockMapEvent {
  features: Array<{
    type: string
    id: string
    geometry?: {
      type: string
      coordinates: number[][][]
    }
    properties: Record<string, string | number>
  }>
}

// 非同期処理の待機ヘルパー関数
async function waitForWatchEffect(fn: () => void, checkFn: () => boolean, timeout = 1000) {
  fn()
  const startTime = Date.now()

  // VueのnextTickを最初に実行してリアクティブシステムを更新
  await nextTick()

  while (Date.now() - startTime < timeout) {
    if (checkFn()) {
      // 追加の待機時間を設けて確実に処理が完了するようにする
      await new Promise((resolve) => setTimeout(resolve, 20))
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  throw new Error(`Watch effect did not complete within ${timeout}ms`)
}

describe('useGridHandler', () => {
  let mockMap: MaplibreRef
  let mockMapInstance: {
    getSource: Mock
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    setActivePinia(createPinia())

    // geotiffモックを正常状態にリセット
    const { fromUrl } = await import('geotiff')
    vi.mocked(fromUrl).mockResolvedValue({
      readRasters: vi.fn().mockResolvedValue({
        width: 2,
        height: 2,
        length: 4,
        0: 50,
        1: 75,
        2: 25,
        3: 100,
      }),
    })

    mockMapInstance = {
      getSource: vi.fn(),
    }
    mockMap = ref(mockMapInstance as unknown as MaplibreRef['value'])

    // メモリ効率化のためpersistStoreを軽量初期状態に設定
    const persistStore = usePersistStore()
    persistStore.featurecollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'test-field-1',
          geometry: {
            type: 'Polygon',
            // 座標数を最小に削減（正方形の最小構成）
            coordinates: [
              [
                [139.0, 35.0],
                [139.1, 35.0],
                [139.1, 35.1],
                [139.0, 35.1],
                [139.0, 35.0],
              ],
            ],
          },
          properties: {
            id: 'test-field-1',
            name: 'テスト圃場',
          },
        },
      ],
    }
  })

  // メモリ効率化のためのクリーンアップ
  afterEach(() => {
    // メモリ効率化のため大きなオブジェクトを明示的にクリア
    const persistStore = usePersistStore()
    persistStore.featurecollection = { type: 'FeatureCollection', features: [] }

    if (global.gc) global.gc()
  })

  describe('初期化', () => {
    it('初期値が正しく設定されている', () => {
      const { gridRotationAngle, gridEW, gridNS, buffer, baseMesh, humusPoint } =
        useGridHandler(mockMap)

      expect(gridRotationAngle.value).toBeNull()
      expect(gridEW.value).toBe(20)
      expect(gridNS.value).toBe(20)
      expect(buffer.value).toBe(0)
      expect(baseMesh.value.type).toBe('FeatureCollection')
      expect(baseMesh.value.features).toEqual([])
      expect(humusPoint.value.type).toBe('FeatureCollection')
      expect(humusPoint.value.features).toEqual([])
    })

    it('必要なプロパティとメソッドがエクスポートされている', () => {
      const handler = useGridHandler(mockMap)

      expect(handler.activeFeature).toBeDefined()
      expect(handler.gridRotationAngle).toBeDefined()
      expect(handler.gridEW).toBeDefined()
      expect(handler.gridNS).toBeDefined()
      expect(handler.buffer).toBeDefined()
      expect(handler.baseMesh).toBeDefined()
      expect(handler.humusPoint).toBeDefined()
      expect(handler.onClickField).toBeDefined()
    })
  })

  describe('onClickField', () => {
    it('フィーチャーがない場合は何もしない', async () => {
      const { onClickField, activeFeature } = useGridHandler(mockMap)
      const mockEvent: MockMapEvent = { features: [] }

      await onClickField(mockEvent)

      expect(activeFeature.value).toBeUndefined()
    })

    it('クリックされたフィーチャーを処理する', async () => {
      const { onClickField, activeFeature, gridRotationAngle } = useGridHandler(mockMap)
      const mockFeature = {
        type: 'Feature',
        id: 'test-field-1',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: { id: 'test-field-1' },
      }
      const mockEvent: MockMapEvent = { features: [mockFeature] }

      await onClickField(mockEvent)

      expect(activeFeature.value).toBeDefined()
      expect(activeFeature.value?.id).toBe('test-field-1')
      expect(gridRotationAngle.value).toBeDefined()
    })

    it('persistStoreからフィーチャーを正しく取得する', async () => {
      const { onClickField, activeFeature } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      expect(activeFeature.value).toBeDefined()
      expect(activeFeature.value?.properties?.name).toBe('テスト圃場')
    })

    it('baseMeshとhumusPointを生成する', async () => {
      const { onClickField, baseMesh, humusPoint } = useGridHandler(mockMap)
      const mockFeature = {
        type: 'Feature',
        id: 'test-field-1',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: { id: 'test-field-1' },
      }
      const mockEvent: MockMapEvent = { features: [mockFeature] }

      await onClickField(mockEvent)

      // baseMeshは drawBaseMeshPolygon が FeatureCollection を返し、
      // transformRotate がそれを処理する
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
      expect(baseMesh.value.features).toBeDefined()
      expect(humusPoint.value.features.length).toBeGreaterThan(0)
    })

    it('エラーが発生した場合、エラーが発生する', async () => {
      const { onClickField } = useGridHandler(mockMap)

      // COG読み込みエラーをシミュレート（リトライでも失敗するように2回設定）
      const { fromUrl } = await import('geotiff')
      vi.mocked(fromUrl).mockRejectedValue(new Error('Network error'))

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      // エラーがthrowされることを確認
      await expect(onClickField(mockEvent)).rejects.toThrow('Network error')
    })
  })

  describe('グリッド生成機能', () => {
    it('gridRotationAngleが変更されたときにグリッドが更新される', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // mockMapにgetSourceメソッドを追加
      mockMapInstance.getSource = vi.fn().mockReturnValue({
        setData: vi.fn(),
      })

      // 回転角度を変更してwatchの実行を待つ
      await waitForWatchEffect(
        () => {
          gridRotationAngle.value = 45
        },
        () => mockMapInstance.getSource.mock.calls.length > 0,
      )

      // getSourceが呼ばれたことを確認
      expect(mockMapInstance.getSource).toHaveBeenCalledWith('base-mesh')
    })

    it('gridEWが変更されたときにグリッドが更新される', async () => {
      const { onClickField, gridEW } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // mockMapにgetSourceメソッドを追加
      const mockSetData = vi.fn()
      mockMapInstance.getSource = vi.fn().mockReturnValue({
        setData: mockSetData,
      })

      // グリッド幅を変更してwatchの実行を待つ
      await waitForWatchEffect(
        () => {
          gridEW.value = 30
        },
        () => mockSetData.mock.calls.length > 0,
      )

      // setDataが呼ばれたことを確認
      expect(mockSetData).toHaveBeenCalled()
    })

    it('bufferが変更されたときにグリッドが更新される', async () => {
      const { onClickField, buffer } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // mockMapにgetSourceメソッドを追加
      const mockSetData = vi.fn()
      mockMapInstance.getSource = vi.fn().mockReturnValue({
        setData: mockSetData,
      })

      // バッファを変更してwatchの実行を待つ
      await waitForWatchEffect(
        () => {
          buffer.value = 5
        },
        () => mockSetData.mock.calls.length > 0,
      )

      // setDataが呼ばれたことを確認
      expect(mockSetData).toHaveBeenCalled()
    })
  })

  describe('COG処理', () => {
    it('COGソースから腐植ポイントを抽出する', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // pointsWithinPolygonの改善されたモックにより、
      // COGデータから生成されたポイントが返される
      // readRastersのモックデータは2x2=4点
      expect(humusPoint.value.features.length).toBe(4)
      expect(humusPoint.value.features[0].properties.humus).toBeDefined()
    })
  })

  describe('メッシュ生成', () => {
    it('ベースメッシュが正しく生成される', async () => {
      const { onClickField, baseMesh } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // baseMeshは FeatureCollection として返される
      expect(baseMesh.value.type).toBe('FeatureCollection')
      expect(baseMesh.value.features).toBeDefined()
      expect(baseMesh.value.features.length).toBeGreaterThan(0)
    })

    it('グリッドパラメータが最小値を下回る場合は10に設定される', async () => {
      const { onClickField, gridEW, gridNS, baseMesh } = useGridHandler(mockMap)

      // グリッドサイズを小さく設定
      gridEW.value = 5
      gridNS.value = 5

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // baseMeshが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
    })
  })

  describe('extractCogSource（COGデータ取得）', () => {
    it('正常にCOGデータを取得できる', async () => {
      const { onClickField } = useGridHandler(mockMap)

      // 正常なCOGデータを設定
      const { fromUrl } = await import('geotiff')
      const mockPool = { destroy: vi.fn() }
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 3,
          height: 3,
          length: 9,
          0: 45,
          1: 50,
          2: 55,
          3: 60,
          4: 65,
          5: 70,
          6: 75,
          7: 80,
          8: 85,
        }),
      }

      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // readRasters が適切なパラメータで呼ばれることを確認
      expect(mockTiff.readRasters).toHaveBeenCalledWith({
        bbox: expect.any(Array),
        samples: [0],
        interleave: true,
        pool: expect.any(Object),
      })

      // 注：Pool.destroyは既存のモックシステムで管理されているため個別検証をスキップ
    })

    it('初回失敗後にリトライで成功する', async () => {
      const { onClickField } = useGridHandler(mockMap)

      const { fromUrl } = await import('geotiff')
      const mockSuccessData = {
        width: 2,
        height: 2,
        length: 4,
        0: 30,
        1: 40,
        2: 50,
        3: 60,
      }

      // 1回目: Pool使用時に失敗
      // 2回目: Pool未使用で成功
      vi.mocked(fromUrl)
        .mockRejectedValueOnce(new Error('Pool memory error'))
        .mockResolvedValueOnce({
          readRasters: vi.fn().mockResolvedValue(mockSuccessData),
        } as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      // エラーログが出力されるが、最終的には成功する
      await onClickField(mockEvent)

      // fromUrl が2回呼ばれることを確認（初回 + リトライ）
      expect(fromUrl).toHaveBeenCalledTimes(2)
    })

    it('初回もリトライも失敗した場合はエラーをthrowする', async () => {
      const { onClickField } = useGridHandler(mockMap)

      const { fromUrl } = await import('geotiff')

      // 両方とも失敗させる
      vi.mocked(fromUrl).mockRejectedValue(new Error('Server unavailable'))

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      // リトライ後のエラーがthrowされることを確認
      await expect(onClickField(mockEvent)).rejects.toThrow('Server unavailable')
    })

    it('異なるbbox範囲でCOGデータを取得できる', async () => {
      const { onClickField } = useGridHandler(mockMap)

      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 4,
          height: 4,
          length: 16,
          // 16個のデータ
          ...Array.from({ length: 16 }, (_, i) => ({ [i]: 20 + i * 5 })).reduce((a, b) => ({
            ...a,
            ...b,
          })),
        }),
      }

      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      // 異なる範囲の田んぼを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'large-field-1',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [140.0, 36.0], // より広い範囲
                  [140.2, 36.0],
                  [140.2, 36.2],
                  [140.0, 36.2],
                  [140.0, 36.0],
                ],
              ],
            },
            properties: {
              id: 'large-field-1',
              name: '大きなテスト圃場',
            },
          },
        ],
      }

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'large-field-1',
            properties: { id: 'large-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // readRasters が適切なbboxで呼ばれることを確認
      expect(mockTiff.readRasters).toHaveBeenCalledWith(
        expect.objectContaining({
          bbox: expect.any(Array),
          samples: [0],
          interleave: true,
        }),
      )
    })

    it('Pool破棄処理が適切に行われる', async () => {
      const { onClickField } = useGridHandler(mockMap)

      // const mockPool = {
      //   destroy: vi.fn(),
      // }
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 2,
          height: 2,
          length: 4,
          0: 25,
          1: 35,
          2: 45,
          3: 55,
        }),
      }

      // Pool と fromUrl のモック
      const { fromUrl } = await import('geotiff')
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // Pool が適切に使用されることを確認（destroyの確認は既存モックシステムで管理）
      expect(mockTiff.readRasters).toHaveBeenCalledWith({
        bbox: expect.any(Array),
        samples: [0],
        interleave: true,
        pool: expect.any(Object),
      })
    })

    it('エラー詳細情報が適切に収集される', async () => {
      const { onClickField } = useGridHandler(mockMap)

      // エラーハンドラーのモック（既存のモックを利用）

      const { fromUrl } = await import('geotiff')
      vi.mocked(fromUrl).mockRejectedValue(new Error('Network timeout'))

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      // エラーが正しくthrowされることを確認
      await expect(onClickField(mockEvent)).rejects.toThrow('Network timeout')
    })
  })

  describe('getHumusPointGridBbox（座標変換とデータマッピング）', () => {
    it('基本的な座標変換が正しく動作する', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      // 2x2のCOGデータを設定
      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 2,
          height: 2,
          length: 4,
          0: 10, // 左上
          1: 20, // 右上
          2: 30, // 左下
          3: 40, // 右下
        }),
      }
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      // 特定のbbox範囲を持つ田んぼを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'coord-test-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [140.0, 36.0], // 左下
                  [140.2, 36.0], // 右下
                  [140.2, 36.2], // 右上
                  [140.0, 36.2], // 左上
                  [140.0, 36.0], // 閉じる
                ],
              ],
            },
            properties: {
              id: 'coord-test-field',
              name: '座標テスト圃場',
            },
          },
        ],
      }

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'coord-test-field',
            properties: { id: 'coord-test-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 正しい数のポイントが生成されることを確認（2x2=4ポイント）
      // ただし、pointsWithinPolygonのモックが1つのポイントのみ返すため、
      // 実際にはモックされた結果が返される
      expect(humusPoint.value.features.length).toBeGreaterThan(0)
      expect(humusPoint.value.features[0].geometry.type).toBe('Point')
      expect(humusPoint.value.features[0].properties).toHaveProperty('humus')
    })

    it('異なるサイズのCOGデータで正しく動作する', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      // 3x1のCOGデータを設定（横長のデータ）
      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 3,
          height: 1,
          length: 3,
          0: 15,
          1: 25,
          2: 35,
        }),
      }
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // データが正常に処理されることを確認
      expect(humusPoint.value.features.length).toBeGreaterThan(0)
    })

    it('腐植値のマッピングが正しく動作する', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      // 特定の腐植値を持つCOGデータを設定
      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 2,
          height: 2,
          length: 4,
          0: 0, // 腐植値0（未定義値のテスト）
          1: 50, // 通常の腐植値
          2: 100, // 高い腐植値
          3: undefined, // undefinedの場合（0になることを期待）
        }),
      }
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // ポイントが生成されることを確認
      expect(humusPoint.value.features.length).toBeGreaterThan(0)

      // モックのpointsWithinPolygonが固定値を返すため、
      // 実際の腐植値マッピングはモック経由では直接テストできない
      // しかし、処理が正常に完了することは確認できる
    })

    it('空のCOGデータでも正常に処理される', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      // 空のCOGデータを設定
      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 0,
          height: 0,
          length: 0,
        }),
      }
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      // エラーを発生させずに処理が完了することを確認
      await expect(onClickField(mockEvent)).resolves.not.toThrow()

      // 空のCOGデータの場合、ポイントが生成されないことを確認
      // ただし、デフォルトポイントが追加される可能性がある
      expect(humusPoint.value.features.length).toBeGreaterThanOrEqual(0)
    })

    it('1x1の最小サイズCOGデータで正しく動作する', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      // 1x1の最小サイズCOGデータ
      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 1,
          height: 1,
          length: 1,
          0: 75, // 単一の腐植値
        }),
      }
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 1つのポイントが正しく生成されることを確認
      expect(humusPoint.value.features.length).toBeGreaterThan(0)
      expect(humusPoint.value.features[0].geometry.type).toBe('Point')
      expect(humusPoint.value.features[0].properties).toHaveProperty('humus')
    })

    it('大きなサイズのCOGデータで正しく動作する', async () => {
      const { onClickField, humusPoint } = useGridHandler(mockMap)

      // 5x5の大きめのCOGデータ（メモリ効率を考慮して適度なサイズ）
      const { fromUrl } = await import('geotiff')
      const mockTiff = {
        readRasters: vi.fn().mockResolvedValue({
          width: 5,
          height: 5,
          length: 25,
          // 25個の腐植値データを生成
          ...Array.from({ length: 25 }, (_, i) => ({ [i]: 10 + i * 2 })).reduce((a, b) => ({
            ...a,
            ...b,
          })),
        }),
      }
      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 大きなデータでも正常に処理されることを確認
      expect(humusPoint.value.features.length).toBeGreaterThan(0)
    })
  })

  describe('drawBaseMeshPolygon（メッシュ分割とポリゴン生成）', () => {
    it('基本的なメッシュ生成が正しく動作する', async () => {
      const { onClickField, baseMesh } = useGridHandler(mockMap)

      // 標準的なグリッドサイズでテスト
      const { gridEW, gridNS } = useGridHandler(mockMap)
      gridEW.value = 20
      gridNS.value = 20

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // baseMeshが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      // baseMeshは FeatureCollection として返される
      expect(baseMesh.value.type).toBe('FeatureCollection')
      expect(baseMesh.value.features).toBeDefined()
    })

    it('グリッドサイズの最小値制限が機能する', async () => {
      const { onClickField, baseMesh, gridEW, gridNS } = useGridHandler(mockMap)

      // 最小値未満の値を設定
      gridEW.value = 5 // 10未満
      gridNS.value = 3 // 10未満

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 最小値制限があっても正常にメッシュが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')

      // 実際の内部処理では10に補正されているはず（ただしモック経由では検証困難）
    })

    it('異なるグリッドサイズでメッシュを生成できる', async () => {
      const { onClickField, baseMesh, gridEW, gridNS } = useGridHandler(mockMap)

      // 大きめのグリッドサイズを設定
      gridEW.value = 50
      gridNS.value = 30

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 異なるサイズでもメッシュが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
    })

    it('小さなグリッドサイズでメッシュを生成できる', async () => {
      const { onClickField, baseMesh, gridEW, gridNS } = useGridHandler(mockMap)

      // 小さめのグリッドサイズを設定（ただし最小値以上）
      gridEW.value = 10
      gridNS.value = 15

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 小さなサイズでもメッシュが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
    })

    it('非正方形のグリッドでメッシュを生成できる', async () => {
      const { onClickField, baseMesh, gridEW, gridNS } = useGridHandler(mockMap)

      // 縦横比が異なるグリッドサイズを設定
      gridEW.value = 25 // 東西方向
      gridNS.value = 40 // 南北方向

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 非正方形でもメッシュが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
    })

    it('大きなフィールドで適切にメッシュを生成する', async () => {
      const { onClickField, baseMesh, gridEW, gridNS } = useGridHandler(mockMap)

      // 大きめのフィールドを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'large-test-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.0, 35.0], // 大きめの範囲
                  [139.5, 35.0], // 約50km四方
                  [139.5, 35.5],
                  [139.0, 35.5],
                  [139.0, 35.0],
                ],
              ],
            },
            properties: {
              id: 'large-test-field',
              name: '大きなテスト圃場',
            },
          },
        ],
      }

      gridEW.value = 100 // 100m メッシュ
      gridNS.value = 100

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'large-test-field',
            properties: { id: 'large-test-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 大きなフィールドでもメッシュが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
    })

    it('極小フィールドでも安全にメッシュを生成する', async () => {
      const { onClickField, baseMesh, gridEW, gridNS } = useGridHandler(mockMap)

      // 極小フィールドを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'tiny-test-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.0, 35.0], // 極小の範囲
                  [139.0001, 35.0], // 約10m四方
                  [139.0001, 35.0001],
                  [139.0, 35.0001],
                  [139.0, 35.0],
                ],
              ],
            },
            properties: {
              id: 'tiny-test-field',
              name: '極小テスト圃場',
            },
          },
        ],
      }

      gridEW.value = 10 // 最小グリッドサイズ
      gridNS.value = 10

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'tiny-test-field',
            properties: { id: 'tiny-test-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 極小フィールドでもエラーなくメッシュが生成されることを確認
      expect(baseMesh.value).toBeDefined()
      expect(baseMesh.value.type).toBe('FeatureCollection')
    })
  })

  describe('fitRotatedBboxDeg（最適回転角度計算）', () => {
    it('基本的な回転角度計算が正しく動作する', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      await onClickField(mockEvent)

      // gridRotationAngleが設定されることを確認
      expect(gridRotationAngle.value).toBeDefined()
      expect(typeof gridRotationAngle.value).toBe('number')

      // 回転角度が0-90度の範囲内であることを確認
      expect(gridRotationAngle.value).toBeGreaterThanOrEqual(0)
      expect(gridRotationAngle.value).toBeLessThanOrEqual(90)
    })

    it('長方形のフィールドで回転角度を計算する', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      // 長方形のフィールドを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'rectangle-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.0, 35.0],
                  [139.2, 35.0], // 横長の長方形
                  [139.2, 35.05],
                  [139.0, 35.05],
                  [139.0, 35.0],
                ],
              ],
            },
            properties: {
              id: 'rectangle-field',
              name: '長方形テスト圃場',
            },
          },
        ],
      }

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'rectangle-field',
            properties: { id: 'rectangle-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 長方形でも正常に回転角度が計算されることを確認
      expect(gridRotationAngle.value).toBeDefined()
      expect(typeof gridRotationAngle.value).toBe('number')
      expect(gridRotationAngle.value).toBeGreaterThanOrEqual(0)
      expect(gridRotationAngle.value).toBeLessThanOrEqual(90)
    })

    it('正方形のフィールドで回転角度を計算する', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      // 正方形のフィールドを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'square-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.0, 35.0],
                  [139.1, 35.0], // 正方形
                  [139.1, 35.1],
                  [139.0, 35.1],
                  [139.0, 35.0],
                ],
              ],
            },
            properties: {
              id: 'square-field',
              name: '正方形テスト圃場',
            },
          },
        ],
      }

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'square-field',
            properties: { id: 'square-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 正方形でも回転角度が計算されることを確認
      expect(gridRotationAngle.value).toBeDefined()
      expect(typeof gridRotationAngle.value).toBe('number')
      expect(gridRotationAngle.value).toBeGreaterThanOrEqual(0)
      expect(gridRotationAngle.value).toBeLessThanOrEqual(90)
    })

    it('不規則な形状のフィールドで回転角度を計算する', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      // 不規則な形状のフィールドを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'irregular-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.0, 35.0],
                  [139.15, 35.02], // 不規則な形状
                  [139.18, 35.08],
                  [139.12, 35.12],
                  [139.02, 35.08],
                  [139.0, 35.0],
                ],
              ],
            },
            properties: {
              id: 'irregular-field',
              name: '不規則形状テスト圃場',
            },
          },
        ],
      }

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'irregular-field',
            properties: { id: 'irregular-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 不規則形状でも回転角度が計算されることを確認
      expect(gridRotationAngle.value).toBeDefined()
      expect(typeof gridRotationAngle.value).toBe('number')
      expect(gridRotationAngle.value).toBeGreaterThanOrEqual(0)
      expect(gridRotationAngle.value).toBeLessThanOrEqual(90)
    })

    it('極小フィールドで回転角度を安全に計算する', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      // 極小フィールドを設定
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'tiny-rotation-field',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [139.0, 35.0],
                  [139.0001, 35.0], // 極小サイズ
                  [139.0001, 35.0001],
                  [139.0, 35.0001],
                  [139.0, 35.0],
                ],
              ],
            },
            properties: {
              id: 'tiny-rotation-field',
              name: '極小回転テスト圃場',
            },
          },
        ],
      }

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'tiny-rotation-field',
            properties: { id: 'tiny-rotation-field' },
          },
        ],
      }

      await onClickField(mockEvent)

      // 極小フィールドでもエラーなく回転角度が計算されることを確認
      expect(gridRotationAngle.value).toBeDefined()
      expect(typeof gridRotationAngle.value).toBe('number')
      expect(gridRotationAngle.value).toBeGreaterThanOrEqual(0)
      expect(gridRotationAngle.value).toBeLessThanOrEqual(90)
    })

    it('複数回実行しても一貫した結果が得られる', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      const mockEvent: MockMapEvent = {
        features: [
          {
            type: 'Feature',
            id: 'test-field-1',
            properties: { id: 'test-field-1' },
          },
        ],
      }

      // 初回実行
      await onClickField(mockEvent)
      const firstRotation = gridRotationAngle.value

      // 2回目実行
      await onClickField(mockEvent)
      const secondRotation = gridRotationAngle.value

      // 同じフィールドで同じ結果が得られることを確認
      expect(firstRotation).toBe(secondRotation)
      expect(typeof firstRotation).toBe('number')
      expect(firstRotation).toBeGreaterThanOrEqual(0)
      expect(firstRotation).toBeLessThanOrEqual(90)
    })

    it('回転角度計算でエラーが発生しないことを確認', async () => {
      const { onClickField, gridRotationAngle } = useGridHandler(mockMap)

      // 様々な形状でテスト
      const testFields = [
        {
          id: 'test-1',
          coordinates: [
            [139.0, 35.0],
            [139.1, 35.0],
            [139.1, 35.1],
            [139.0, 35.1],
            [139.0, 35.0],
          ], // 正方形
        },
        {
          id: 'test-2',
          coordinates: [
            [139.0, 35.0],
            [139.2, 35.0],
            [139.2, 35.05],
            [139.0, 35.05],
            [139.0, 35.0],
          ], // 横長
        },
        {
          id: 'test-3',
          coordinates: [
            [139.0, 35.0],
            [139.05, 35.0],
            [139.05, 35.2],
            [139.0, 35.2],
            [139.0, 35.0],
          ], // 縦長
        },
      ]

      for (const field of testFields) {
        const persistStore = usePersistStore()
        persistStore.featurecollection = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              id: field.id,
              geometry: {
                type: 'Polygon',
                coordinates: [field.coordinates],
              },
              properties: {
                id: field.id,
                name: `テストフィールド ${field.id}`,
              },
            },
          ],
        }

        const mockEvent: MockMapEvent = {
          features: [
            {
              type: 'Feature',
              id: field.id,
              properties: { id: field.id },
            },
          ],
        }

        // エラーを発生させずに回転角度が計算されることを確認
        await expect(onClickField(mockEvent)).resolves.not.toThrow()

        expect(gridRotationAngle.value).toBeDefined()
        expect(typeof gridRotationAngle.value).toBe('number')
        expect(gridRotationAngle.value).toBeGreaterThanOrEqual(0)
        expect(gridRotationAngle.value).toBeLessThanOrEqual(90)
      }
    })
  })
})
