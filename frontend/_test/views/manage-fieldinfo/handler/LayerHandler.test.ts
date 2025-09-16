import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import type { ShallowRef } from 'vue'
import type { MaplibreMap } from '@/types/maplibre'

// 環境変数のモック - import.meta.envは直接モックできないため、実際の値が存在することだけを確認

// TerraDrawのモック
vi.mock('terra-draw', () => ({
  TerraDraw: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    setMode: vi.fn(),
    getSnapshot: vi.fn(),
    addFeatures: vi.fn(),
    clear: vi.fn(),
    stop: vi.fn(),
  })),
  TerraDrawSelectMode: vi.fn(),
  TerraDrawPolygonMode: vi.fn(),
  ValidateNotSelfIntersecting: vi.fn(),
}))

vi.mock('terra-draw-maplibre-gl-adapter', () => ({
  TerraDrawMapLibreGLAdapter: vi.fn(),
}))

// PMTilesのモック
vi.mock('pmtiles', () => ({
  Protocol: vi.fn().mockImplementation(() => ({
    tile: vi.fn(),
  })),
}))

// addProtocolのモック
vi.mock('maplibre-gl', () => ({
  addProtocol: vi.fn(),
}))

// LayerHandlerのインポート（モックの後に行う）
import {
  SOURCE_NAME,
  REGISTERED_LAYER_NAME,
  LINE_LAYER_NAME,
  FILL_LAYER_NAME,
  PMTILES,
  COORDINATE_PRECISION,
  addSource,
  addLayer,
  removeLayer,
  removeSource,
  addEditLayer,
  removeEditLayer,
  addPMTilesSource,
  addPMTilesLayer,
  removePMTitlesSource,
  removePMTitlesLayer,
  setupTerraDraw,
} from '@/views/manage-fieldinfo/handler/LayerHandler'

// モジュールから関数を取得
import { TerraDraw, TerraDrawSelectMode, TerraDrawPolygonMode } from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

describe('LayerHandler', () => {
  let mockMap: MaplibreMap
  
  // MapLibre GLのモック
  const mockAddSource = vi.fn()
  const mockAddLayer = vi.fn()
  const mockRemoveLayer = vi.fn()
  const mockRemoveSource = vi.fn()
  const mockGetLayer = vi.fn()
  const mockGetSource = vi.fn()

  const createMockMap = (): MaplibreMap => ({
    addSource: mockAddSource,
    addLayer: mockAddLayer,
    removeLayer: mockRemoveLayer,
    removeSource: mockRemoveSource,
    getLayer: mockGetLayer,
    getSource: mockGetSource,
  } as any)

  beforeEach(() => {
    vi.clearAllMocks()
    mockMap = createMockMap()
  })

  describe('定数のエクスポート', () => {
    it('必要な定数が正しくエクスポートされている', () => {
      expect(SOURCE_NAME).toBe('registeredFields')
      expect(REGISTERED_LAYER_NAME).toBe('registeredLayer')
      expect(LINE_LAYER_NAME).toBe('editLineLayer')
      expect(FILL_LAYER_NAME).toBe('editFillLayer')
      // PMTILES.urlは環境変数に依存するため、オブジェクト自体の構造のみ確認
      expect(PMTILES).toHaveProperty('url')
      expect(PMTILES.source).toBe('2024hokkaido_fudepolygon')
      expect(PMTILES.sourceId).toBe('fude-polygon-pmtiles')
      expect(PMTILES.lineLayerId).toBe('pmTileLineLayerId')
      expect(PMTILES.fillLayerId).toBe('pmTileFillLayerId')
      expect(COORDINATE_PRECISION).toBe(9)
    })
  })

  describe('addSource', () => {
    it('GeoJSONソースを追加する', () => {
      const featureCollection = {
        type: 'FeatureCollection',
        features: [],
      }

      addSource(mockMap, featureCollection)

      expect(mockAddSource).toHaveBeenCalledWith(SOURCE_NAME, {
        type: 'geojson',
        data: featureCollection,
        promoteId: 'id',
      })
    })
  })

  describe('addLayer', () => {
    it('登録済みレイヤーを追加する', () => {
      addLayer(mockMap)

      expect(mockAddLayer).toHaveBeenCalledWith({
        id: REGISTERED_LAYER_NAME,
        type: 'fill',
        source: SOURCE_NAME,
        paint: {
          'fill-color': 'blue',
          'fill-opacity': 0.6,
        },
      })
    })
  })

  describe('removeLayer', () => {
    it('レイヤーが存在する場合は削除する', () => {
      mockGetLayer.mockReturnValue(true)
      
      removeLayer(mockMap)

      expect(mockGetLayer).toHaveBeenCalledWith(REGISTERED_LAYER_NAME)
      expect(mockRemoveLayer).toHaveBeenCalledWith(REGISTERED_LAYER_NAME)
    })

    it('レイヤーが存在しない場合は何もしない', () => {
      mockGetLayer.mockReturnValue(false)
      
      removeLayer(mockMap)

      expect(mockGetLayer).toHaveBeenCalledWith(REGISTERED_LAYER_NAME)
      expect(mockRemoveLayer).not.toHaveBeenCalled()
    })

    it('マップがnullまたはundefinedの場合は何もしない', () => {
      removeLayer(null)
      removeLayer(undefined)

      expect(mockGetLayer).not.toHaveBeenCalled()
      expect(mockRemoveLayer).not.toHaveBeenCalled()
    })
  })

  describe('removeSource', () => {
    it('ソースが存在する場合は削除する', () => {
      mockGetSource.mockReturnValue(true)
      
      removeSource(mockMap)

      expect(mockGetSource).toHaveBeenCalledWith(SOURCE_NAME)
      expect(mockRemoveSource).toHaveBeenCalledWith(SOURCE_NAME)
    })

    it('ソースが存在しない場合は何もしない', () => {
      mockGetSource.mockReturnValue(false)
      
      removeSource(mockMap)

      expect(mockGetSource).toHaveBeenCalledWith(SOURCE_NAME)
      expect(mockRemoveSource).not.toHaveBeenCalled()
    })
  })

  describe('addEditLayer', () => {
    it('編集用のラインとフィルレイヤーを追加する', () => {
      addEditLayer(mockMap)

      expect(mockAddLayer).toHaveBeenCalledTimes(2)
      
      // ラインレイヤーの確認
      expect(mockAddLayer).toHaveBeenCalledWith({
        id: LINE_LAYER_NAME,
        type: 'line',
        source: SOURCE_NAME,
        paint: {
          'line-color': 'gray',
          'line-width': 1,
        },
      })
      
      // フィルレイヤーの確認
      expect(mockAddLayer).toHaveBeenCalledWith({
        id: FILL_LAYER_NAME,
        type: 'fill',
        source: SOURCE_NAME,
        paint: {
          'fill-color': ['case', ['boolean', ['feature-state', 'selected'], false], 'red', 'yellow'],
          'fill-opacity': 0.3,
        },
      })
    })
  })

  describe('removeEditLayer', () => {
    it('編集レイヤーが存在する場合は削除する', () => {
      mockGetLayer.mockReturnValue(true)
      
      removeEditLayer(mockMap)

      expect(mockGetLayer).toHaveBeenCalledWith(FILL_LAYER_NAME)
      expect(mockGetLayer).toHaveBeenCalledWith(LINE_LAYER_NAME)
      expect(mockRemoveLayer).toHaveBeenCalledWith(FILL_LAYER_NAME)
      expect(mockRemoveLayer).toHaveBeenCalledWith(LINE_LAYER_NAME)
    })
  })

  describe('PMTiles関連', () => {
    describe('addPMTilesSource', () => {
      it('PMTilesソースを追加する', () => {
        addPMTilesSource(mockMap)

        expect(mockAddSource).toHaveBeenCalledWith(PMTILES.sourceId, {
          type: 'vector',
          url: `pmtiles://${PMTILES.url}`,
          minzoom: 8,
          maxzoom: 17,
        })
      })
    })

    describe('addPMTilesLayer', () => {
      it('PMTilesレイヤーを追加する', () => {
        addPMTilesLayer(mockMap)

        expect(mockAddLayer).toHaveBeenCalledTimes(2)
        
        // ラインレイヤーの確認
        expect(mockAddLayer).toHaveBeenCalledWith(
          {
            id: PMTILES.lineLayerId,
            type: 'line',
            source: PMTILES.sourceId,
            'source-layer': PMTILES.source,
            paint: {
              'line-color': 'gray',
              'line-width': 1,
            },
          },
          'registeredLayer',
        )
        
        // フィルレイヤーの確認
        expect(mockAddLayer).toHaveBeenCalledWith(
          {
            id: PMTILES.fillLayerId,
            type: 'fill',
            source: PMTILES.sourceId,
            'source-layer': PMTILES.source,
            paint: {
              'fill-color': 'yellow',
              'fill-opacity': 0.3,
            },
          },
          'registeredLayer',
        )
      })
    })

    describe('removePMTitlesSource', () => {
      it('PMTilesソースが存在する場合は削除する', () => {
        mockGetSource.mockReturnValue(true)
        
        removePMTitlesSource(mockMap)

        expect(mockGetSource).toHaveBeenCalledWith(PMTILES.sourceId)
        expect(mockRemoveSource).toHaveBeenCalledWith(PMTILES.sourceId)
      })
    })

    describe('removePMTitlesLayer', () => {
      it('PMTilesレイヤーが存在する場合は削除する', () => {
        mockGetLayer.mockReturnValue(true)
        
        removePMTitlesLayer(mockMap)

        expect(mockGetLayer).toHaveBeenCalledWith(PMTILES.lineLayerId)
        expect(mockGetLayer).toHaveBeenCalledWith(PMTILES.fillLayerId)
        expect(mockRemoveLayer).toHaveBeenCalledWith(PMTILES.lineLayerId)
        expect(mockRemoveLayer).toHaveBeenCalledWith(PMTILES.fillLayerId)
      })
    })
  })

  describe('setupTerraDraw', () => {
    it('TerraDrawインスタンスを作成して返す', () => {
      const mapRef: ShallowRef<MaplibreMap | null> = ref(mockMap)
      
      const draw = setupTerraDraw(mapRef)

      expect(draw).toBeDefined()
      expect(draw.start).toBeDefined()
    })

    it('MapLibreGLAdapterに正しいパラメータを渡す', () => {
      const mapRef: ShallowRef<MaplibreMap | null> = ref(mockMap)
      
      setupTerraDraw(mapRef)

      expect(TerraDrawMapLibreGLAdapter).toHaveBeenCalledWith({
        map: mockMap,
        coordinatePrecision: COORDINATE_PRECISION,
      })
    })

    it('SelectModeとPolygonModeが正しく設定される', () => {
      const mapRef: ShallowRef<MaplibreMap | null> = ref(mockMap)
      
      setupTerraDraw(mapRef)
      
      expect(TerraDrawSelectMode).toHaveBeenCalled()
      expect(TerraDrawPolygonMode).toHaveBeenCalled()
      expect(TerraDraw).toHaveBeenCalledWith({
        tracked: true,
        adapter: expect.any(Object),
        modes: expect.arrayContaining([
          expect.any(Object),
          expect.any(Object),
        ]),
      })
    })
  })
})