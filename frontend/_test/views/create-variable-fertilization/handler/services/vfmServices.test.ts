import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createVfm, updateVrf } from '@/views/create-variable-fertilization/handler/services/vfmServices'
import type { Feature, Polygon } from 'geojson'
import type { BaseGrid, HumusPoints, ApplicationGridFeatures } from '@/types/geom'
import { getHumusMeanFeatures } from '@/views/create-variable-fertilization/handler/calculations/humus'
import {
  distributeFertilizerRateSteps,
  distributeFertilizerRateStepless,
} from '@/views/create-variable-fertilization/handler/calculations/distribution'

// calculations/humus.tsのモック
vi.mock('@/views/create-variable-fertilization/handler/calculations/humus', () => ({
  getHumusMeanFeatures: vi.fn(),
}))

// calculations/distribution.tsのモック
vi.mock('@/views/create-variable-fertilization/handler/calculations/distribution', () => ({
  distributeFertilizerRateSteps: vi.fn(),
  distributeFertilizerRateStepless: vi.fn(),
}))

// モックデータ作成関数
const createMockActiveFeature = (area = 1000): Feature<Polygon, { area: number }> => ({
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
    ],
  },
  properties: { area },
})

const createMockBaseGrid = (features = 1): BaseGrid => ({
  type: 'FeatureCollection',
  features: Array.from({ length: features }, (_, i) => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[i * 0.5, 0, (i + 1) * 0.5, 0, (i + 1) * 0.5, 0.5, i * 0.5, 0.5, i * 0.5, 0]]],
    },
    properties: { area: 250 },
  })),
})

const createMockHumusPoints = (points = 1): HumusPoints => ({
  type: 'FeatureCollection',
  features: Array.from({ length: points }, (_, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0.25 + i * 0.1, 0.25] },
    properties: { humus: 30 + i * 10 },
  })),
})

describe('vfmServices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createVfm', () => {
    it('正常にVFMを作成できる（ステップレス施肥）', () => {
      const mockActiveFeature = createMockActiveFeature()
      const mockBaseGrid = createMockBaseGrid(2)
      const mockHumusPoints = createMockHumusPoints(2)
      const applicationStep: [number, number, number, number, number] = [0.2, 0.1, 0, -0.1, -0.2]

      // モックの設定
      const mockHumusMeanFeatures = [
        {
          type: 'Feature' as const,
          geometry: mockBaseGrid.features[0].geometry,
          properties: {
            humus_mean: 30,
            area: 250,
            intersects: true,
            amount_fertilization_factor: 0,
            amount_fertilization_unit: 0,
          },
        },
        {
          type: 'Feature' as const,
          geometry: mockBaseGrid.features[1].geometry,
          properties: {
            humus_mean: 40,
            area: 250,
            intersects: true,
            amount_fertilization_factor: 0,
            amount_fertilization_unit: 0,
          },
        },
      ]

      vi.mocked(getHumusMeanFeatures).mockReturnValue(mockHumusMeanFeatures)
      
      const mockFertilizerRateMap = new Map([
        [30, 0.1],
        [40, -0.1],
      ])
      vi.mocked(distributeFertilizerRateStepless).mockReturnValue(mockFertilizerRateMap)

      const result = createVfm(
        mockActiveFeature,
        mockBaseGrid,
        mockHumusPoints,
        false, // ステップレス
        applicationStep,
        100, // baseFertilizationAmount
        false, // missingHumusDataInterpolation
      )

      expect(result.sortedFeatures).toHaveLength(2)
      expect(result.sortedFeatures[0].properties.humus_mean).toBe(30)
      expect(result.sortedFeatures[1].properties.humus_mean).toBe(40)
      
      // 施肥量の計算確認
      expect(result.sortedFeatures[0].properties.amount_fertilization_unit).toBe(110) // 100 * (1 + 0.1)
      expect(result.sortedFeatures[1].properties.amount_fertilization_unit).toBe(90)  // 100 * (1 - 0.1)
      
      // 総面積と総施肥量の確認
      expect(result.areaSum).toBe(500) // 250 * 2
      expect(result.amountSum).toBe(50) // (110 * 250 + 90 * 250) / 1000
    })

    it('5段階施肥モードで正常に動作する', () => {
      const mockActiveFeature = createMockActiveFeature()
      const mockBaseGrid = createMockBaseGrid(5)
      const mockHumusPoints = createMockHumusPoints(5)
      const applicationStep: [number, number, number, number, number] = [0.3, 0.15, 0, -0.15, -0.3]

      // モックの設定
      const mockHumusMeanFeatures = Array.from({ length: 5 }, (_, i) => ({
        type: 'Feature' as const,
        geometry: mockBaseGrid.features[i].geometry,
        properties: {
          humus_mean: 20 + i * 15,
          area: 250,
          intersects: true,
          amount_fertilization_factor: 0,
          amount_fertilization_unit: 0,
        },
      }))

      vi.mocked(getHumusMeanFeatures).mockReturnValue(mockHumusMeanFeatures)
      
      const mockFertilizerRateMap = new Map([
        [20, 0.3],
        [35, 0.15],
        [50, 0],
        [65, -0.15],
        [80, -0.3],
      ])
      vi.mocked(distributeFertilizerRateSteps).mockReturnValue(mockFertilizerRateMap)

      const result = createVfm(
        mockActiveFeature,
        mockBaseGrid,
        mockHumusPoints,
        true, // 5段階
        applicationStep,
        100,
        false,
      )

      expect(result.sortedFeatures).toHaveLength(5)
      expect(distributeFertilizerRateSteps).toHaveBeenCalled()
      expect(distributeFertilizerRateStepless).not.toHaveBeenCalled()
    })

    it('腐植データ補間が有効な場合の処理', () => {
      const mockActiveFeature = createMockActiveFeature()
      const mockBaseGrid = createMockBaseGrid(2)
      const mockHumusPoints = createMockHumusPoints(0)
      const applicationStep: [number, number, number, number, number] = [0.2, 0.1, 0, -0.1, -0.2]

      // 腐植データなしのフィーチャーを返す
      const mockHumusMeanFeatures = [
        {
          type: 'Feature' as const,
          geometry: mockBaseGrid.features[0].geometry,
          properties: {
            humus_mean: 0,
            area: 250,
            intersects: true,
            amount_fertilization_factor: 0,
            amount_fertilization_unit: 0,
          },
        },
      ]

      vi.mocked(getHumusMeanFeatures).mockReturnValue(mockHumusMeanFeatures)
      
      const mockFertilizerRateMap = new Map([
        [0, -1], // 腐植値0は除外値
      ])
      vi.mocked(distributeFertilizerRateStepless).mockReturnValue(mockFertilizerRateMap)

      const result = createVfm(
        mockActiveFeature,
        mockBaseGrid,
        mockHumusPoints,
        false,
        applicationStep,
        120,
        true, // 補間有効
      )

      // 補間処理により基準施肥量が設定される
      expect(result.sortedFeatures[0].properties.amount_fertilization_factor).toBe(0)
      expect(result.sortedFeatures[0].properties.amount_fertilization_unit).toBe(120)
      expect(result.areaSum).toBe(250)
      expect(result.amountSum).toBe(30) // 120 * 250 / 1000
    })

    it('施肥量がマイナスの場合は0にする', () => {
      const mockActiveFeature = createMockActiveFeature()
      const mockBaseGrid = createMockBaseGrid(1)
      const mockHumusPoints = createMockHumusPoints(1)
      const applicationStep: [number, number, number, number, number] = [2, 1, 0, -1, -2]

      const mockHumusMeanFeatures = [{
        type: 'Feature' as const,
        geometry: mockBaseGrid.features[0].geometry,
        properties: {
          humus_mean: 100,
          area: 250,
          intersects: true,
          amount_fertilization_factor: 0,
          amount_fertilization_unit: 0,
        },
      }]

      vi.mocked(getHumusMeanFeatures).mockReturnValue(mockHumusMeanFeatures)
      
      const mockFertilizerRateMap = new Map([
        [100, -2], // 200%減 = -100%
      ])
      vi.mocked(distributeFertilizerRateStepless).mockReturnValue(mockFertilizerRateMap)

      const result = createVfm(
        mockActiveFeature,
        mockBaseGrid,
        mockHumusPoints,
        false,
        applicationStep,
        100,
        false,
      )

      // 施肥量がマイナスになる場合は0
      expect(result.sortedFeatures[0].properties.amount_fertilization_unit).toBe(0)
      expect(result.areaSum).toBe(0) // 施肥量0の場合は面積に含まれない
      expect(result.amountSum).toBe(0)
    })
  })

  describe('updateVrf', () => {
    it('applicationGridを正しく更新する', () => {
      const applicationGrid: ApplicationGridFeatures = [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          properties: {
            humus_mean: 40,
            area: 250,
            intersects: true,
            amount_fertilization_factor: 0,
            amount_fertilization_unit: 100,
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
          },
          properties: {
            humus_mean: 30,
            area: 250,
            intersects: true,
            amount_fertilization_factor: 0,
            amount_fertilization_unit: 100,
          },
        },
      ]

      const applicationStep: [number, number, number, number, number] = [0.2, 0.1, 0, -0.1, -0.2]

      const mockFertilizerRateMap = new Map([
        [30, 0.1],
        [40, -0.1],
      ])
      vi.mocked(distributeFertilizerRateStepless).mockReturnValue(mockFertilizerRateMap)

      const result = updateVrf(
        applicationGrid,
        false, // ステップレス
        applicationStep,
        150, // baseFertilizationAmount
        false,
      )

      // ソートされていることを確認
      expect(result.applicationGrid[0].properties.humus_mean).toBe(30)
      expect(result.applicationGrid[1].properties.humus_mean).toBe(40)

      // 施肥量が更新されていることを確認
      expect(result.applicationGrid[0].properties.amount_fertilization_unit).toBe(165) // 150 * 1.1
      expect(result.applicationGrid[1].properties.amount_fertilization_unit).toBe(135) // 150 * 0.9

      // 総面積と総施肥量
      expect(result.areaSum).toBe(500)
      expect(result.amountSum).toBe(75) // (165 * 250 + 135 * 250) / 1000
    })

    it('5段階施肥での更新が正しく動作する', () => {
      const applicationGrid: ApplicationGridFeatures = Array.from({ length: 5 }, (_, i) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        properties: {
          humus_mean: 20 + i * 15,
          area: 200,
          intersects: true,
          amount_fertilization_factor: 0,
          amount_fertilization_unit: 100,
        },
      }))

      const applicationStep: [number, number, number, number, number] = [0.3, 0.15, 0, -0.15, -0.3]

      const mockFertilizerRateMap = new Map([
        [20, 0.3],
        [35, 0.15],
        [50, 0],
        [65, -0.15],
        [80, -0.3],
      ])
      vi.mocked(distributeFertilizerRateSteps).mockReturnValue(mockFertilizerRateMap)

      const result = updateVrf(
        applicationGrid,
        true, // 5段階
        applicationStep,
        100,
        false,
      )

      expect(distributeFertilizerRateSteps).toHaveBeenCalled()
      expect(result.applicationGrid).toHaveLength(5)
    })

    it('腐植データ欠損時の補間処理', () => {
      const applicationGrid: ApplicationGridFeatures = [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          properties: {
            humus_mean: 0,
            area: 300,
            intersects: true,
            amount_fertilization_factor: -1,
            amount_fertilization_unit: 0,
          },
        },
      ]

      const applicationStep: [number, number, number, number, number] = [0.2, 0.1, 0, -0.1, -0.2]

      const mockFertilizerRateMap = new Map([
        [0, -1],
      ])
      vi.mocked(distributeFertilizerRateStepless).mockReturnValue(mockFertilizerRateMap)

      const result = updateVrf(
        applicationGrid,
        false,
        applicationStep,
        80,
        true, // 補間有効
      )

      // 補間により基準施肥量が設定される
      expect(result.applicationGrid[0].properties.amount_fertilization_factor).toBe(0)
      expect(result.applicationGrid[0].properties.amount_fertilization_unit).toBe(80)
      expect(result.areaSum).toBe(300)
      expect(result.amountSum).toBe(24) // 80 * 300 / 1000
    })
  })
})