import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ref } from 'vue'
import { useRegisterFudepolyHandler } from '@/views/manage-fieldinfo/handler/useRegisterFudepolyHandler'
import type { DrawRef, MaplibreRef } from '@/types/maplibre'

// Turfのモック
vi.mock('@turf/turf', () => {
  const mockUnion = vi.fn().mockReturnValue({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[139.0, 35.0], [139.1, 35.0], [139.1, 35.1], [139.0, 35.1], [139.0, 35.0]]],
    },
    properties: {},
  })

  const mockFeatureCollection = vi.fn().mockImplementation((features) => ({
    type: 'FeatureCollection',
    features,
  }))

  const mockSimplify = vi.fn().mockImplementation((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: [[[139.123456, 35.123456], [139.123456, 35.123456], [139.123456, 35.123456], [139.123456, 35.123456], [139.123456, 35.123456]]],
    },
  }))

  return {
    union: mockUnion,
    featureCollection: mockFeatureCollection,
    simplify: mockSimplify,
  }
})

// LayerHandlerのモック
vi.mock('@/views/manage-fieldinfo/handler/LayerHandler', () => ({
  removePMTitlesSource: vi.fn(),
  removePMTitlesLayer: vi.fn(),
  PMTILES: {
    fillLayerId: 'pmtiles-fill-layer',
    sourceId: 'pmtiles-source',
    source: 'pmtiles-source-layer',
  },
  COORDINATE_PRECISION: 6,
}))

describe('useRegisterFudepolyHandler', () => {
  let mockMap: MaplibreRef
  let mockDraw: DrawRef
  let mockMapInstance: {
    on: Mock
    off: Mock
    querySourceFeatures: Mock
  }
  let mockDrawInstance: {
    addFeatures: Mock
    setMode: Mock
    selectFeature: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockMapInstance = {
      on: vi.fn(),
      off: vi.fn(),
      querySourceFeatures: vi.fn().mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[139.0, 35.0], [139.1, 35.0], [139.1, 35.1], [139.0, 35.1], [139.0, 35.0]]],
          },
          properties: {
            polygon_uuid: 'test-uuid-1',
          },
        },
      ]),
    }
    mockMap = ref(mockMapInstance as any)

    mockDrawInstance = {
      addFeatures: vi.fn().mockReturnValue([{ id: 'feature-1' }]),
      setMode: vi.fn(),
      selectFeature: vi.fn(),
    }
    mockDraw = ref(mockDrawInstance as any)
  })

  describe('初期化', () => {
    it('必要なメソッドがエクスポートされている', () => {
      const handler = useRegisterFudepolyHandler(mockMap, mockDraw)

      expect(handler.onClickRegisterFudepolyLayer).toBeDefined()
      expect(handler.offClickRegisterFudepolyLayer).toBeDefined()
    })
  })

  describe('onClickRegisterFudepolyLayer', () => {
    it('mapインスタンスにクリックイベントリスナーを登録する', () => {
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      expect(mockMapInstance.on).toHaveBeenCalledWith('click', 'pmtiles-fill-layer', expect.any(Function))
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      expect(mockMapInstance.on).not.toHaveBeenCalled()
    })
  })

  describe('offClickRegisterFudepolyLayer', () => {
    it('mapインスタンスからクリックイベントリスナーを削除する', () => {
      const { offClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      offClickRegisterFudepolyLayer()

      expect(mockMapInstance.off).toHaveBeenCalledWith('click', 'pmtiles-fill-layer', expect.any(Function))
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { offClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      offClickRegisterFudepolyLayer()

      expect(mockMapInstance.off).not.toHaveBeenCalled()
    })
  })

  describe('clickRegisterFudepolyLayer', () => {
    it('単一のポリゴンFeatureを正しく登録する', async () => {
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)
      const LayerHandler = await import('@/views/manage-fieldinfo/handler/LayerHandler')

      onClickRegisterFudepolyLayer()

      // クリックイベントハンドラーを取得して実行
      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(mockMapInstance.querySourceFeatures).toHaveBeenCalledWith('pmtiles-source', {
        sourceLayer: 'pmtiles-source-layer',
      })
      expect(mockDrawInstance.addFeatures).toHaveBeenCalled()
      expect(LayerHandler.removePMTitlesLayer).toHaveBeenCalledWith(mockMapInstance)
      expect(LayerHandler.removePMTitlesSource).toHaveBeenCalledWith(mockMapInstance)
      expect(mockDrawInstance.setMode).toHaveBeenCalledWith('select')
      expect(mockDrawInstance.selectFeature).toHaveBeenCalledWith('feature-1')
    })

    it('複数のポリゴンFeatureをunionして登録する', async () => {
      // 複数のポリゴンを返すようにモック設定
      mockMapInstance.querySourceFeatures.mockReturnValue([
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[139.0, 35.0], [139.05, 35.0], [139.05, 35.05], [139.0, 35.05], [139.0, 35.0]]],
          },
          properties: {
            polygon_uuid: 'test-uuid-1',
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[139.05, 35.0], [139.1, 35.0], [139.1, 35.05], [139.05, 35.05], [139.05, 35.0]]],
          },
          properties: {
            polygon_uuid: 'test-uuid-1',
          },
        },
      ])

      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)
      const { union, featureCollection } = require('@turf/turf')

      onClickRegisterFudepolyLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      const turfModule = await import('@turf/turf')
      expect(turfModule.featureCollection).toHaveBeenCalled()
      expect(turfModule.union).toHaveBeenCalled()
      expect(mockDrawInstance.addFeatures).toHaveBeenCalled()
    })

    it('座標精度が正しく処理される', () => {
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      // addFeaturesに渡される座標が適切に丸められているかチェック
      const addedFeatures = mockDrawInstance.addFeatures.mock.calls[0][0]
      const coordinates = addedFeatures[0].geometry.coordinates[0]
      
      // 座標が6桁精度で丸められていることを確認
      coordinates.forEach((coord: number[]) => {
        expect(coord[0]).toBe(139.123456)
        expect(coord[1]).toBe(35.123456)
      })
    })

    it('featuresがない場合は何もしない', () => {
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {}

      clickHandler(mockEvent)

      expect(mockMapInstance.querySourceFeatures).not.toHaveBeenCalled()
      expect(mockDrawInstance.addFeatures).not.toHaveBeenCalled()
    })

    it('mapがnullの場合は何もしない', () => {
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      // mapをnullに設定
      mockMap.value = null

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      expect(() => {
        clickHandler(mockEvent)
      }).not.toThrow()
    })

    it('drawがnullの場合は何もしない', () => {
      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      // drawをnullに設定
      mockDraw.value = null

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(mockMapInstance.querySourceFeatures).not.toHaveBeenCalled()
      expect(mockDrawInstance.addFeatures).not.toHaveBeenCalled()
    })

    it('unionの結果がnullの場合は何もしない', async () => {
      // unionがnullを返すようにモック設定
      const turfModule = await import('@turf/turf')
      vi.mocked(turfModule.union).mockReturnValueOnce(null)

      mockMapInstance.querySourceFeatures.mockReturnValue([
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { polygon_uuid: 'test-uuid-1' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { polygon_uuid: 'test-uuid-1' },
        },
      ])

      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(mockDrawInstance.addFeatures).not.toHaveBeenCalled()
    })

    it('addFeaturesがundefinedを返した場合は何もしない', () => {
      mockDrawInstance.addFeatures.mockReturnValue(undefined)

      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(mockDrawInstance.setMode).not.toHaveBeenCalled()
      expect(mockDrawInstance.selectFeature).not.toHaveBeenCalled()
    })

    it('featureIdがnullの場合はselectFeatureを呼ばない', () => {
      mockDrawInstance.addFeatures.mockReturnValue([{ id: null }])

      const { onClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      onClickRegisterFudepolyLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              polygon_uuid: 'test-uuid-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(mockDrawInstance.setMode).toHaveBeenCalledWith('select')
      expect(mockDrawInstance.selectFeature).not.toHaveBeenCalled()
    })
  })

  describe('イベントライフサイクル', () => {
    it('onとoffを正しい順序で呼び出すことができる', () => {
      const { onClickRegisterFudepolyLayer, offClickRegisterFudepolyLayer } = useRegisterFudepolyHandler(mockMap, mockDraw)

      // イベントリスナーを登録
      onClickRegisterFudepolyLayer()
      expect(mockMapInstance.on).toHaveBeenCalledTimes(1)

      // イベントリスナーを削除
      offClickRegisterFudepolyLayer()
      expect(mockMapInstance.off).toHaveBeenCalledTimes(1)
    })
  })
})