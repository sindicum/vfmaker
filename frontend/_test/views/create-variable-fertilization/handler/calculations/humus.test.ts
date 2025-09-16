import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getHumusMeanFeatures } from '@/views/create-variable-fertilization/handler/calculations/humus'
import type { Feature, Polygon, Point } from 'geojson'
import type { BaseGrid, HumusPoints } from '@/types/geom'

// Turf.jsのモック
vi.mock('@turf/turf', () => ({
  booleanDisjoint: vi.fn(),
  booleanPointInPolygon: vi.fn(),
  centroid: vi.fn(),
  distance: vi.fn(),
}))

// geojson-rbushのモック
vi.mock('@turf/geojson-rbush', () => ({
  default: vi.fn(),
}))

describe('getHumusMeanFeatures', () => {
  // メモリ効率化のためのクリーンアップ
  afterEach(() => {
    vi.clearAllMocks()
    if (global.gc) global.gc()
  })

  // テスト用のヘルパー関数
  const createActiveFeature = (area = 1000): Feature<Polygon, { area: number }> => ({
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

  const createBaseGrid = (gridCount = 1): BaseGrid => ({
    type: 'FeatureCollection',
    features: Array.from({ length: gridCount }, (_, i) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [i * 0.5, 0],
            [(i + 1) * 0.5, 0],
            [(i + 1) * 0.5, 0.5],
            [i * 0.5, 0.5],
            [i * 0.5, 0],
          ],
        ],
      },
      properties: { area: 250 },
    })),
  })

  const createHumusPoints = (points: Array<{ coords: [number, number]; humus: number }>): HumusPoints => ({
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p.coords },
      properties: { humus: p.humus },
    })),
  })

  describe('基本的な腐植平均値計算', () => {
    it('単一グリッドに複数ポイントがある場合の平均値計算', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 30 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 40 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 50 } },
          ],
        }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon).mockReturnValue(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([
        { coords: [0.25, 0.25], humus: 30 },
        { coords: [0.25, 0.25], humus: 40 },
        { coords: [0.25, 0.25], humus: 50 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(40) // (30+40+50)/3 = 40
      expect(result[0].properties.area).toBe(250)
      expect(result[0].properties.intersects).toBe(true)
    })

    it('腐植値0を除外した平均値計算', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 0 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 60 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 40 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 0 } },
          ],
        }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon).mockReturnValue(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([
        { coords: [0.25, 0.25], humus: 0 },
        { coords: [0.25, 0.25], humus: 60 },
        { coords: [0.25, 0.25], humus: 40 },
        { coords: [0.25, 0.25], humus: 0 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(50) // (60+40)/2 = 50（0は除外）
    })

    it('複数グリッドでの個別計算', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({
            // グリッド1用
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.1, 0.25] }, properties: { humus: 20 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.2, 0.25] }, properties: { humus: 30 } },
            ],
          })
          .mockReturnValueOnce({
            // グリッド2用
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.6, 0.25] }, properties: { humus: 50 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.7, 0.25] }, properties: { humus: 70 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(2)
      const humusPoints = createHumusPoints([
        { coords: [0.1, 0.25], humus: 20 },
        { coords: [0.2, 0.25], humus: 30 },
        { coords: [0.6, 0.25], humus: 50 },
        { coords: [0.7, 0.25], humus: 70 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(2)
      expect(result[0].properties.humus_mean).toBe(25) // (20+30)/2 = 25
      expect(result[1].properties.humus_mean).toBe(60) // (50+70)/2 = 60
    })
  })

  describe('近隣探索機能', () => {
    it('グリッド内にポイントがない場合の近隣探索', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({ features: [] }) // 初回検索：ポイントなし
          .mockReturnValueOnce({
            // 近隣探索：ポイント発見
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.6, 0.6] }, properties: { humus: 45 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.25, 0.25] },
        properties: {},
      })
      vi.mocked(turf.distance).mockReturnValue(0.005) // 5m（範囲内）

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([{ coords: [0.6, 0.6], humus: 45 }])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(45)
      expect(mockIndex.search).toHaveBeenCalledTimes(2) // 初回検索 + 近隣探索
    })

    it('近隣探索で最も近いポイントを選択', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({ features: [] }) // 初回検索：ポイントなし
          .mockReturnValueOnce({
            // 近隣探索：複数ポイント
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.3, 0.3] }, properties: { humus: 30 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.35, 0.35] }, properties: { humus: 40 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.4, 0.4] }, properties: { humus: 50 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.25, 0.25] },
        properties: {},
      })
      // 距離を順に設定（最初のポイントが最も近い）
      vi.mocked(turf.distance)
        .mockReturnValueOnce(0.003) // 3m
        .mockReturnValueOnce(0.005) // 5m
        .mockReturnValueOnce(0.007) // 7m

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([
        { coords: [0.3, 0.3], humus: 30 },
        { coords: [0.35, 0.35], humus: 40 },
        { coords: [0.4, 0.4], humus: 50 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(30) // 最も近いポイントの値
    })

    it('近隣探索で腐植値0のポイントを除外', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({ features: [] }) // 初回検索：ポイントなし
          .mockReturnValueOnce({
            // 近隣探索：腐植値0と有効値の混在
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.3, 0.3] }, properties: { humus: 0 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.35, 0.35] }, properties: { humus: 35 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.25, 0.25] },
        properties: {},
      })
      vi.mocked(turf.distance)
        .mockReturnValueOnce(0.003) // 腐植値0のポイント
        .mockReturnValueOnce(0.005) // 有効なポイント

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([
        { coords: [0.3, 0.3], humus: 0 },
        { coords: [0.35, 0.35], humus: 35 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(35) // 腐植値0は除外され、有効値を使用
    })

    it('近隣探索範囲外のポイントは使用しない', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({ features: [] }) // 初回検索：ポイントなし
          .mockReturnValueOnce({
            // 近隣探索：範囲外のポイント
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.5, 0.5] }, properties: { humus: 50 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.25, 0.25] },
        properties: {},
      })
      vi.mocked(turf.distance).mockReturnValue(0.008) // 8m（範囲外: 7.1mより大きい）

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([{ coords: [0.5, 0.5], humus: 50 }])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(0) // 範囲外なので初期値0のまま
    })
  })

  describe('intersectsプロパティの計算', () => {
    it('グリッドがアクティブフィーチャーと交差する場合', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 30 } },
          ],
        }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon).mockReturnValue(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false) // 交差している

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([{ coords: [0.25, 0.25], humus: 30 }])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.intersects).toBe(true)
    })

    it('グリッドがアクティブフィーチャーと交差しない場合', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 30 } },
          ],
        }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon).mockReturnValue(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(true) // 交差していない

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([{ coords: [0.25, 0.25], humus: 30 }])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.intersects).toBe(false)
    })
  })

  describe('エッジケース', () => {
    it('空のグリッドの場合', async () => {
      const geojsonRbush = await import('@turf/geojson-rbush')
      const mockIndex = {
        load: vi.fn(),
        search: vi.fn(),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)

      const activeFeature = createActiveFeature()
      const baseGrid: BaseGrid = { type: 'FeatureCollection', features: [] }
      const humusPoints = createHumusPoints([{ coords: [0.25, 0.25], humus: 30 }])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(0)
    })

    it('腐植ポイントが空の場合', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({ features: [] }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.25, 0.25] },
        properties: {},
      })

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints: HumusPoints = { type: 'FeatureCollection', features: [] }

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(0) // ポイントがないので0
    })

    it('全てのポイントが腐植値0の場合', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 0 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.25, 0.25] }, properties: { humus: 0 } },
          ],
        }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon).mockReturnValue(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([
        { coords: [0.25, 0.25], humus: 0 },
        { coords: [0.25, 0.25], humus: 0 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(0) // 全て0なので平均も0
    })

    it('booleanPointInPolygonのフィルタリング確認', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn().mockReturnValue({
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.1, 0.1] }, properties: { humus: 20 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.2, 0.2] }, properties: { humus: 30 } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [0.3, 0.3] }, properties: { humus: 40 } },
          ],
        }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      // 最初の2つのポイントのみグリッド内
      vi.mocked(turf.booleanPointInPolygon)
        .mockReturnValueOnce(true)  // ポイント1: 内部
        .mockReturnValueOnce(true)  // ポイント2: 内部
        .mockReturnValueOnce(false) // ポイント3: 外部
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(1)
      const humusPoints = createHumusPoints([
        { coords: [0.1, 0.1], humus: 20 },
        { coords: [0.2, 0.2], humus: 30 },
        { coords: [0.3, 0.3], humus: 40 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(25) // (20+30)/2 = 25（40は除外）
      expect(turf.booleanPointInPolygon).toHaveBeenCalledTimes(3)
    })
  })

  describe('複雑なシナリオ', () => {
    it('複数グリッドでの混合シナリオ（ポイントあり・なし・近隣探索）', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({
            // グリッド1: ポイントあり
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.1, 0.1] }, properties: { humus: 25 } },
            ],
          })
          .mockReturnValueOnce({ features: [] }) // グリッド2: ポイントなし（初回）
          .mockReturnValueOnce({
            // グリッド2: 近隣探索で発見
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [0.6, 0.1] }, properties: { humus: 35 } },
            ],
          })
          .mockReturnValueOnce({
            // グリッド3: ポイントあり
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [1.1, 0.1] }, properties: { humus: 45 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanPointInPolygon).mockReturnValue(true)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0.75, 0.25] },
        properties: {},
      })
      vi.mocked(turf.distance).mockReturnValue(0.005) // 5m（範囲内）

      const activeFeature = createActiveFeature()
      const baseGrid = createBaseGrid(3)
      const humusPoints = createHumusPoints([
        { coords: [0.1, 0.1], humus: 25 },
        { coords: [0.6, 0.1], humus: 35 },
        { coords: [1.1, 0.1], humus: 45 },
      ])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(3)
      expect(result[0].properties.humus_mean).toBe(25) // 直接ポイント
      expect(result[1].properties.humus_mean).toBe(35) // 近隣探索
      expect(result[2].properties.humus_mean).toBe(45) // 直接ポイント
      expect(mockIndex.search).toHaveBeenCalledTimes(4) // 3グリッド + 1近隣探索
    })

    it('緯度による動的な経度計算の確認', async () => {
      const turf = await import('@turf/turf')
      const geojsonRbush = await import('@turf/geojson-rbush')

      const mockIndex = {
        load: vi.fn(),
        search: vi.fn()
          .mockReturnValueOnce({ features: [] }) // 初回検索：ポイントなし
          .mockReturnValueOnce({
            // 近隣探索
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [139.7, 35.7] }, properties: { humus: 50 } },
            ],
          }),
      }
      vi.mocked(geojsonRbush.default).mockReturnValue(mockIndex as any)
      vi.mocked(turf.booleanDisjoint).mockReturnValue(false)
      // 東京付近の座標（緯度35.7度）
      vi.mocked(turf.centroid).mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [139.7, 35.7] },
        properties: {},
      })
      vi.mocked(turf.distance).mockReturnValue(0.005)

      const activeFeature = createActiveFeature()
      const baseGrid: BaseGrid = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [139.695, 35.695],
                [139.705, 35.695],
                [139.705, 35.705],
                [139.695, 35.705],
                [139.695, 35.695],
              ],
            ],
          },
          properties: { area: 250 },
        }],
      }
      const humusPoints = createHumusPoints([{ coords: [139.7, 35.7], humus: 50 }])

      const result = getHumusMeanFeatures(activeFeature, baseGrid, humusPoints)

      expect(result).toHaveLength(1)
      expect(result[0].properties.humus_mean).toBe(50)

      // search呼び出しで渡されたbboxを確認
      const searchCall = mockIndex.search.mock.calls[1][0]
      expect(searchCall.geometry.type).toBe('Polygon')
      // 緯度35.7度での経度補正が適用されていることを確認
      const coords = searchCall.geometry.coordinates[0]
      const lonRange = coords[2][0] - coords[0][0] // 東西の範囲
      const latRange = coords[2][1] - coords[0][1] // 南北の範囲
      // 緯度35.7度では経度方向の距離が緯度方向より大きくなる
      expect(lonRange).toBeGreaterThan(latRange)
    })
  })
})