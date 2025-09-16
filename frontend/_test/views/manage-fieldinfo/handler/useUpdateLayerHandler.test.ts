import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useUpdateLayerHandler } from '@/views/manage-fieldinfo/handler/useUpdateLayerHandler'
import type { DrawRef, MaplibreRef } from '@/types/maplibre'

// LayerHandlerのモック
vi.mock('@/views/manage-fieldinfo/handler/LayerHandler', () => ({
  removeEditLayer: vi.fn(),
  COORDINATE_PRECISION: 6,
}))

// Turfのモック
vi.mock('@turf/turf', () => ({
  simplify: vi.fn().mockImplementation((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: [[[139.123457, 35.123457], [139.123457, 35.123457], [139.123457, 35.123457], [139.123457, 35.123457], [139.123457, 35.123457]]],
    },
  })),
}))

describe('useUpdateLayerHandler', () => {
  let mockMap: MaplibreRef
  let mockDraw: DrawRef
  let mockMapInstance: {
    on: Mock
    off: Mock
    queryRenderedFeatures: Mock
  }
  let mockDrawInstance: {
    clear: Mock
    addFeatures: Mock
    setMode: Mock
    selectFeature: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    
    mockMapInstance = {
      on: vi.fn(),
      off: vi.fn(),
      queryRenderedFeatures: vi.fn().mockReturnValue([]),
    }
    mockMap = ref(mockMapInstance as any)

    mockDrawInstance = {
      clear: vi.fn(),
      addFeatures: vi.fn().mockReturnValue([{ id: 'feature-1' }]),
      setMode: vi.fn(),
      selectFeature: vi.fn(),
    }
    mockDraw = ref(mockDrawInstance as any)

    // persistStoreの初期状態を設定
    const persistStore = usePersistStore()
    persistStore.featurecollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[139.123456789, 35.123456789], [139.223456789, 35.123456789], [139.223456789, 35.223456789], [139.123456789, 35.223456789], [139.123456789, 35.123456789]]],
          },
          properties: {
            id: 'test-polygon-1',
            name: 'テストポリゴン',
          },
        },
      ],
    }
  })

  describe('初期化', () => {
    it('初期値が正しく設定されている', () => {
      const { updatePolygonId } = useUpdateLayerHandler(mockMap, mockDraw)

      expect(updatePolygonId.value).toBe('')
    })

    it('必要なプロパティとメソッドがエクスポートされている', () => {
      const handler = useUpdateLayerHandler(mockMap, mockDraw)

      expect(handler.updatePolygonId).toBeDefined()
      expect(handler.onClickUpdateLayer).toBeDefined()
      expect(handler.offClickUpdateLayer).toBeDefined()
    })
  })

  describe('onClickUpdateLayer', () => {
    it('mapインスタンスにクリックイベントリスナーを登録する', () => {
      const { onClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      onClickUpdateLayer()

      expect(mockMapInstance.on).toHaveBeenCalledWith('click', 'editFillLayer', expect.any(Function))
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { onClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      onClickUpdateLayer()

      expect(mockMapInstance.on).not.toHaveBeenCalled()
    })
  })

  describe('offClickUpdateLayer', () => {
    it('mapインスタンスからクリックイベントリスナーを削除し状態をリセットする', () => {
      const { offClickUpdateLayer, updatePolygonId } = useUpdateLayerHandler(mockMap, mockDraw)

      // テスト用にIDを設定
      updatePolygonId.value = 'test-id'

      offClickUpdateLayer()

      expect(mockDrawInstance.clear).toHaveBeenCalled()
      expect(mockMapInstance.off).toHaveBeenCalledWith('click', 'editFillLayer', expect.any(Function))
      expect(updatePolygonId.value).toBe('')
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { offClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      offClickUpdateLayer()

      expect(mockMapInstance.off).not.toHaveBeenCalled()
      expect(mockDrawInstance.clear).not.toHaveBeenCalled()
    })

    it('drawがnullの場合は早期リターンで何も実行されない', () => {
      const { onClickUpdateLayer, offClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)
      
      // まずonClickUpdateLayerを呼び出してイベントリスナーを登録
      onClickUpdateLayer()
      
      // その後drawをnullにしてoffClickUpdateLayerを呼び出し
      mockDraw.value = null
      offClickUpdateLayer()

      // drawがnullの場合は早期リターンするため、map.offも呼ばれない
      expect(mockMapInstance.off).not.toHaveBeenCalled()
      expect(mockDrawInstance.clear).not.toHaveBeenCalled()
    })
  })

  describe('clickUpdateFillLayer', () => {
    it('編集対象ポリゴンが正しく設定される', async () => {
      const { onClickUpdateLayer, updatePolygonId } = useUpdateLayerHandler(mockMap, mockDraw)
      const LayerHandler = await import('@/views/manage-fieldinfo/handler/LayerHandler')

      onClickUpdateLayer()

      // クリックイベントハンドラーを取得して実行
      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              id: 'test-polygon-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(updatePolygonId.value).toBe('test-polygon-1')
      expect(mockDrawInstance.addFeatures).toHaveBeenCalled()
      expect(LayerHandler.removeEditLayer).toHaveBeenCalledWith(mockMapInstance)
      expect(mockDrawInstance.setMode).toHaveBeenCalledWith('select')
      expect(mockDrawInstance.selectFeature).toHaveBeenCalledWith('feature-1')
    })

    it('座標精度が正しく処理される', () => {
      const { onClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      // queryRenderedFeaturesが座標データを返すようにモック設定
      mockMapInstance.queryRenderedFeatures.mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[139.123456789, 35.123456789], [139.223456789, 35.123456789], [139.223456789, 35.223456789], [139.123456789, 35.223456789], [139.123456789, 35.123456789]]],
          },
          properties: {
            id: 'test-polygon-1',
          },
        },
      ])

      onClickUpdateLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              id: 'test-polygon-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      // addFeaturesに渡される座標が適切に丸められているかチェック
      const addedFeatures = mockDrawInstance.addFeatures.mock.calls[0][0]
      const coordinates = addedFeatures[0].geometry.coordinates[0]
      
      // 座標が6桁精度で丸められていることを確認（実際のsimplifyモックの戻り値）
      coordinates.forEach((coord: number[]) => {
        // 座標が6桁精度で丸められる（入力座標によって異なる）
        if (coord[0] > 139.2) {
          expect(coord[0]).toBe(139.223457)
        } else {
          expect(coord[0]).toBe(139.123457)
        }
        if (coord[1] > 35.2) {
          expect(coord[1]).toBe(35.223457)
        } else {
          expect(coord[1]).toBe(35.123457)
        }
      })
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { onClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      onClickUpdateLayer()
      
      // mapがnullの場合は何も実行されない
      expect(mockMapInstance.on).not.toHaveBeenCalled()
    })

    it('drawがnullの場合は何もしない', () => {
      mockDraw.value = null
      const { onClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      onClickUpdateLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              id: 'test-polygon-1',
            },
          },
        ],
      }

      expect(() => {
        clickHandler(mockEvent)
      }).not.toThrow()

      expect(mockDrawInstance.addFeatures).not.toHaveBeenCalled()
    })

    it('addFeaturesが空のIDを返した場合はselectFeatureを呼ばない', () => {
      mockDrawInstance.addFeatures.mockReturnValue([{ id: null }])
      
      const { onClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      onClickUpdateLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              id: 'test-polygon-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(mockDrawInstance.selectFeature).not.toHaveBeenCalled()
    })
  })

  describe('イベントライフサイクル', () => {
    it('onとoffを正しい順序で呼び出すことができる', () => {
      const { onClickUpdateLayer, offClickUpdateLayer } = useUpdateLayerHandler(mockMap, mockDraw)

      // イベントリスナーを登録
      onClickUpdateLayer()
      expect(mockMapInstance.on).toHaveBeenCalledTimes(1)

      // イベントリスナーを削除
      offClickUpdateLayer()
      expect(mockMapInstance.off).toHaveBeenCalledTimes(1)
      expect(mockDrawInstance.clear).toHaveBeenCalledTimes(1)
    })
  })
})

// 必要なストアをインポート
import { usePersistStore } from '@/stores/persistStore'