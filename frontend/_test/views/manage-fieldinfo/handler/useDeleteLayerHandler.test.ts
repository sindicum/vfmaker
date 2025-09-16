import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ref } from 'vue'
import { useDeleteLayerHandler } from '@/views/manage-fieldinfo/handler/useDeleteLayerHandler'
import type { MaplibreRef } from '@/types/maplibre'

// LayerHandlerの定数をモック
vi.mock('@/views/manage-fieldinfo/handler/LayerHandler', () => ({
  SOURCE_NAME: 'field-source',
  FILL_LAYER_NAME: 'field-fill-layer',
}))

describe('useDeleteLayerHandler', () => {
  let mockMap: MaplibreRef
  let mockMapInstance: {
    on: Mock
    off: Mock
    setFeatureState: Mock
    queryRenderedFeatures: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockMapInstance = {
      on: vi.fn(),
      off: vi.fn(),
      setFeatureState: vi.fn(),
      queryRenderedFeatures: vi.fn().mockReturnValue([
        { id: 'feature-1', properties: { id: 'test-1' } },
        { id: 'feature-2', properties: { id: 'test-2' } },
      ]),
    }
    mockMap = ref(mockMapInstance as any)
  })

  describe('初期化', () => {
    it('初期値が正しく設定されている', () => {
      const { deletePolygonId } = useDeleteLayerHandler(mockMap)

      expect(deletePolygonId.value).toBe('')
    })

    it('必要なプロパティとメソッドがエクスポートされている', () => {
      const handler = useDeleteLayerHandler(mockMap)

      expect(handler.deletePolygonId).toBeDefined()
      expect(handler.onClickDeleteLayer).toBeDefined()
      expect(handler.offClickDeleteLayer).toBeDefined()
    })
  })

  describe('onClickDeleteLayer', () => {
    it('mapインスタンスにクリックイベントリスナーを登録する', () => {
      const { onClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      expect(mockMapInstance.on).toHaveBeenCalledWith('click', 'field-fill-layer', expect.any(Function))
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { onClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      expect(mockMapInstance.on).not.toHaveBeenCalled()
    })
  })

  describe('offClickDeleteLayer', () => {
    it('mapインスタンスからクリックイベントリスナーを削除し状態をリセットする', () => {
      const { offClickDeleteLayer, deletePolygonId } = useDeleteLayerHandler(mockMap)

      // テスト用にIDを設定
      deletePolygonId.value = 'test-polygon-1'

      offClickDeleteLayer()

      expect(mockMapInstance.off).toHaveBeenCalledWith('click', 'field-fill-layer', expect.any(Function))
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'test-polygon-1' },
        { selected: false }
      )
      expect(deletePolygonId.value).toBe('')
    })

    it('mapがnullの場合は何もしない', () => {
      mockMap.value = null
      const { offClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      offClickDeleteLayer()

      expect(mockMapInstance.off).not.toHaveBeenCalled()
      expect(mockMapInstance.setFeatureState).not.toHaveBeenCalled()
    })
  })

  describe('clickDeleteFillLayer', () => {
    it('削除対象ポリゴンが正しく選択される', () => {
      const { onClickDeleteLayer, deletePolygonId } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      // クリックイベントハンドラーを取得して実行
      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              id: 'target-polygon-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(deletePolygonId.value).toBe('target-polygon-1')
      
      // 既存の選択状態をクリア
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'feature-1' },
        { selected: false }
      )
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'feature-2' },
        { selected: false }
      )
      
      // 新しいポリゴンを選択
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'target-polygon-1' },
        { selected: true }
      )
    })

    it('featuresが空の場合は何もしない', () => {
      const { onClickDeleteLayer, deletePolygonId } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [],
      }

      clickHandler(mockEvent)

      expect(deletePolygonId.value).toBe('')
      expect(mockMapInstance.queryRenderedFeatures).not.toHaveBeenCalled()
    })

    it('featuresがundefinedの場合は何もしない', () => {
      const { onClickDeleteLayer, deletePolygonId } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {}

      clickHandler(mockEvent)

      expect(deletePolygonId.value).toBe('')
      expect(mockMapInstance.queryRenderedFeatures).not.toHaveBeenCalled()
    })

    it('feature.propertiesがない場合は何もしない', () => {
      const { onClickDeleteLayer, deletePolygonId } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: null,
          },
        ],
      }

      clickHandler(mockEvent)

      expect(deletePolygonId.value).toBe('')
      expect(mockMapInstance.queryRenderedFeatures).not.toHaveBeenCalled()
    })

    it('feature.properties.idがない場合は何もしない', () => {
      const { onClickDeleteLayer, deletePolygonId } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              name: 'テストポリゴン',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      expect(deletePolygonId.value).toBe('')
      expect(mockMapInstance.queryRenderedFeatures).not.toHaveBeenCalled()
    })

    it('mapがnullの場合は何もしない', () => {
      const { onClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      // mapをnullに設定
      mockMap.value = null

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
    })

    it('queryRenderedFeaturesでidがnullのfeatureは無視される', () => {
      // idがnullのfeatureを含むレスポンスを設定
      mockMapInstance.queryRenderedFeatures.mockReturnValue([
        { id: 'feature-1', properties: { id: 'test-1' } },
        { id: null, properties: { id: 'test-null' } },
        { id: 'feature-3', properties: { id: 'test-3' } },
      ])

      const { onClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()

      const clickHandler = mockMapInstance.on.mock.calls[0][2]
      const mockEvent = {
        features: [
          {
            properties: {
              id: 'target-polygon-1',
            },
          },
        ],
      }

      clickHandler(mockEvent)

      // idがnullでないfeatureのみsetFeatureStateが呼ばれる
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledTimes(3) // 2回のfalse + 1回のtrue
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'feature-1' },
        { selected: false }
      )
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'feature-3' },
        { selected: false }
      )
      expect(mockMapInstance.setFeatureState).toHaveBeenCalledWith(
        { source: 'field-source', id: 'target-polygon-1' },
        { selected: true }
      )
    })
  })

  describe('イベントライフサイクル', () => {
    it('onとoffを正しい順序で呼び出すことができる', () => {
      const { onClickDeleteLayer, offClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      // イベントリスナーを登録
      onClickDeleteLayer()
      expect(mockMapInstance.on).toHaveBeenCalledTimes(1)

      // イベントリスナーを削除
      offClickDeleteLayer()
      expect(mockMapInstance.off).toHaveBeenCalledTimes(1)
    })

    it('複数回onを呼び出すと複数回イベントリスナーが登録される', () => {
      const { onClickDeleteLayer } = useDeleteLayerHandler(mockMap)

      onClickDeleteLayer()
      onClickDeleteLayer()
      onClickDeleteLayer()

      expect(mockMapInstance.on).toHaveBeenCalledTimes(3)
    })
  })
})