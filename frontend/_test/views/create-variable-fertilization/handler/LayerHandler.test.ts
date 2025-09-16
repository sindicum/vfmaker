import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addSource,
  addLayer,
  removeLayer,
  removeSource,
  addHumusGrid,
  removeHumusGrid,
  addBaseMesh,
  removeBaseMesh,
  addVraMap,
  removeVraMap,
} from '@/views/create-variable-fertilization/handler/LayerHandler'
import type { MaplibreMap } from '@/types/maplibre'
import type { FeatureCollection } from 'geojson'

// MapLibreのモック
const createMockMap = () => ({
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
  getLayer: vi.fn(),
  getSource: vi.fn(),
})

// サンプルFeatureCollection
const mockFeatureCollection: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 1, name: 'Field 1' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    },
  ],
}

describe('LayerHandler', () => {
  let mockMap: ReturnType<typeof createMockMap>

  beforeEach(() => {
    mockMap = createMockMap()
    vi.clearAllMocks()
  })

  describe('addSource', () => {
    it('registeredFieldsソースを追加する', () => {
      addSource(mockMap as unknown as MaplibreMap, mockFeatureCollection)

      expect(mockMap.addSource).toHaveBeenCalledWith('registeredFields', {
        type: 'geojson',
        data: mockFeatureCollection,
        promoteId: 'id',
      })
    })

    it('mapがnullの場合は何もしない', () => {
      addSource(null as any, mockFeatureCollection)
      expect(mockMap.addSource).not.toHaveBeenCalled()
    })
  })

  describe('addLayer', () => {
    it('fillとlineレイヤーを追加する', () => {
      addLayer(mockMap as unknown as MaplibreMap)

      expect(mockMap.addLayer).toHaveBeenCalledTimes(2)
      expect(mockMap.addLayer).toHaveBeenCalledWith({
        id: 'registeredFillLayer',
        type: 'fill',
        source: 'registeredFields',
        paint: {
          'fill-color': 'white',
          'fill-opacity': 0.1,
        },
      })
      expect(mockMap.addLayer).toHaveBeenCalledWith({
        id: 'registeredLineLayer',
        type: 'line',
        source: 'registeredFields',
        paint: {
          'line-color': 'blue',
          'line-opacity': 0.6,
          'line-width': 3,
        },
      })
    })
  })

  describe('removeLayer', () => {
    it('存在するレイヤーを削除する', () => {
      mockMap.getLayer.mockImplementation((id: string) => id === 'registeredFillLayer' || id === 'registeredLineLayer')
      
      removeLayer(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).toHaveBeenCalledWith('registeredFillLayer')
      expect(mockMap.removeLayer).toHaveBeenCalledWith('registeredLineLayer')
    })

    it('レイヤーが存在しない場合は削除しない', () => {
      mockMap.getLayer.mockReturnValue(false)
      
      removeLayer(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).not.toHaveBeenCalled()
    })

    it('mapがnullの場合は何もしない', () => {
      removeLayer(null)
      expect(mockMap.getLayer).not.toHaveBeenCalled()
    })
  })

  describe('removeSource', () => {
    it('存在するソースを削除する', () => {
      mockMap.getSource.mockReturnValue(true)
      
      removeSource(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeSource).toHaveBeenCalledWith('registeredFields')
    })

    it('ソースが存在しない場合は削除しない', () => {
      mockMap.getSource.mockReturnValue(false)
      
      removeSource(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeSource).not.toHaveBeenCalled()
    })
  })

  describe('addHumusGrid', () => {
    const humusGridData: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { humus: 50 },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    }

    it('腐植グリッドを追加する', () => {
      addHumusGrid(mockMap as unknown as MaplibreMap, humusGridData)

      expect(mockMap.addSource).toHaveBeenCalledWith('humusGrid', {
        type: 'geojson',
        data: humusGridData,
      })
      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'humusGrid-label',
          type: 'symbol',
          source: 'humusGrid',
        })
      )
    })

    it('既存のグリッドを削除してから追加する', () => {
      mockMap.getLayer.mockImplementation((id: string) => id === 'humusGrid-label')
      
      addHumusGrid(mockMap as unknown as MaplibreMap, humusGridData)

      expect(mockMap.removeLayer).toHaveBeenCalledWith('humusGrid-label')
      expect(mockMap.removeSource).toHaveBeenCalledWith('humusGrid')
    })
  })

  describe('removeHumusGrid', () => {
    it('腐植グリッドレイヤーとソースを削除する', () => {
      mockMap.getLayer.mockImplementation((id: string) => id === 'humusGrid-label')
      
      removeHumusGrid(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).toHaveBeenCalledWith('humusGrid-label')
      expect(mockMap.removeSource).toHaveBeenCalledWith('humusGrid')
    })

    it('レイヤーが存在しない場合は何もしない', () => {
      mockMap.getLayer.mockReturnValue(false)
      
      removeHumusGrid(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).not.toHaveBeenCalled()
    })
  })

  describe('addBaseMesh', () => {
    const baseMeshData: FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    }

    it('ベースメッシュを追加する', () => {
      addBaseMesh(mockMap as unknown as MaplibreMap, baseMeshData)

      expect(mockMap.addSource).toHaveBeenCalledWith('base-mesh', {
        type: 'geojson',
        data: baseMeshData,
      })
      expect(mockMap.addLayer).toHaveBeenCalledWith({
        id: 'base-mesh',
        type: 'line',
        source: 'base-mesh',
        paint: {
          'line-color': 'red',
          'line-opacity': 0.6,
        },
      })
    })
  })

  describe('removeBaseMesh', () => {
    it('ベースメッシュを削除する', () => {
      mockMap.getLayer.mockImplementation((id: string) => id === 'base-mesh')
      
      removeBaseMesh(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).toHaveBeenCalledWith('base-mesh')
      expect(mockMap.removeSource).toHaveBeenCalledWith('base-mesh')
    })
  })

  describe('addVraMap', () => {
    const vraMapData: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { 
            amount_fertilization_factor: 1.0,
            amount_fertilization_unit: '100kg'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
        },
      ],
    }
    it('VRAマップを追加する', () => {
      addVraMap(mockMap as unknown as MaplibreMap, vraMapData)

      expect(mockMap.addSource).toHaveBeenCalledWith('vra-map-default', {
        type: 'geojson',
        data: vraMapData,
      })
      expect(mockMap.addLayer).toHaveBeenCalledTimes(2)
      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vra-map-default',
          type: 'fill',
          source: 'vra-map-default',
        })
      )
      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vra-map-symbol-default',
          type: 'symbol',
          source: 'vra-map-default',
        })
      )
    })

    it('既存のVRAマップを削除してから追加する', () => {
      mockMap.getLayer.mockImplementation((id: string) => id === 'vra-map-default' || id === 'vra-map-symbol-default')
      
      addVraMap(mockMap as unknown as MaplibreMap, vraMapData)

      expect(mockMap.removeLayer).toHaveBeenCalledWith('vra-map-default')
      expect(mockMap.removeLayer).toHaveBeenCalledWith('vra-map-symbol-default')
      expect(mockMap.removeSource).toHaveBeenCalledWith('vra-map-default')
    })
  })

  describe('removeVraMap', () => {
    it('VRAマップのレイヤーとソースを削除する', () => {
      mockMap.getLayer.mockImplementation((id: string) => id === 'vra-map-default')
      
      removeVraMap(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).toHaveBeenCalledWith('vra-map-default')
      expect(mockMap.removeLayer).toHaveBeenCalledWith('vra-map-symbol-default')
      expect(mockMap.removeSource).toHaveBeenCalledWith('vra-map-default')
    })

    it('レイヤーが存在しない場合は何もしない', () => {
      mockMap.getLayer.mockReturnValue(false)
      
      removeVraMap(mockMap as unknown as MaplibreMap)

      expect(mockMap.removeLayer).not.toHaveBeenCalled()
    })
  })
})