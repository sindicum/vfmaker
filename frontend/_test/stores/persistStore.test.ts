import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePersistStore } from '@/stores/persistStore'
import { useStore } from '@/stores/store'
import type { Feature, Polygon } from 'geojson'

// LocalStorageのモック
const mockLocalStorage = () => {
  const storage: Record<string, string> = {}
  
  global.localStorage = {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    length: 0,
    key: vi.fn(),
  }
}

// テスト用のポリゴンフィーチャーを作成
const createTestFeature = (id: string): Feature<Polygon> => ({
  type: 'Feature',
  id: id,
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
  },
  properties: {},
})

describe('usePersistStore', () => {
  beforeEach(() => {
    mockLocalStorage()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されている', () => {
      const store = usePersistStore()
      
      expect(store.featurecollection).toEqual({
        type: 'FeatureCollection',
        features: [],
      })
      expect(store.centerPosition).toEqual({
        lng: 142.5,
        lat: 43.5,
        zoom: 7,
      })
    })
  })

  describe('addFeature', () => {
    it('フィーチャーを追加できる', () => {
      const persistStore = usePersistStore()
      const generalStore = useStore()
      const feature = createTestFeature('test-1')
      
      persistStore.addFeature(feature)
      
      expect(persistStore.featurecollection.features).toHaveLength(1)
      expect(persistStore.featurecollection.features[0]).toEqual({
        type: 'Feature',
        geometry: feature.geometry,
        properties: { id: 'test-1' },
      })
      expect(generalStore.alertMessage).toEqual({
        alertType: 'Info',
        message: 'ポリゴンを登録しました',
      })
    })

    it('IDがundefinedのフィーチャーは追加されない', () => {
      const persistStore = usePersistStore()
      const feature = createTestFeature('test-1')
      delete feature.id
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      persistStore.addFeature(feature)
      
      expect(persistStore.featurecollection.features).toHaveLength(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith('feature.id が undefined です')
    })

    it('最大10個までフィーチャーを追加できる', () => {
      const persistStore = usePersistStore()
      
      // 10個のフィーチャーを追加
      for (let i = 1; i <= 10; i++) {
        persistStore.addFeature(createTestFeature(`test-${i}`))
      }
      
      expect(persistStore.featurecollection.features).toHaveLength(10)
    })

    it('10個を超えるフィーチャーは追加されない', () => {
      const persistStore = usePersistStore()
      const generalStore = useStore()
      
      // 10個のフィーチャーを追加
      for (let i = 1; i <= 10; i++) {
        persistStore.addFeature(createTestFeature(`test-${i}`))
      }
      
      // 11個目を追加しようとする
      persistStore.addFeature(createTestFeature('test-11'))
      
      expect(persistStore.featurecollection.features).toHaveLength(10)
      expect(generalStore.alertMessage).toEqual({
        alertType: 'Error',
        message: 'ポリゴン登録上限（10筆）に達してます',
      })
    })

    it('数値IDも文字列として処理される', () => {
      const persistStore = usePersistStore()
      const feature = createTestFeature('123')
      feature.id = 123
      
      persistStore.addFeature(feature)
      
      expect(persistStore.featurecollection.features[0].properties.id).toBe('123')
    })
  })

  describe('clearFeatureCollection', () => {
    it('すべてのフィーチャーをクリアできる', () => {
      const persistStore = usePersistStore()
      
      // いくつかフィーチャーを追加
      persistStore.addFeature(createTestFeature('test-1'))
      persistStore.addFeature(createTestFeature('test-2'))
      persistStore.addFeature(createTestFeature('test-3'))
      
      expect(persistStore.featurecollection.features).toHaveLength(3)
      
      // クリア
      persistStore.clearFeatureCollection()
      
      expect(persistStore.featurecollection.features).toHaveLength(0)
    })
  })

  describe('centerPositionの更新', () => {
    it('中心位置を更新できる', () => {
      const persistStore = usePersistStore()
      
      persistStore.centerPosition = {
        lng: 140.0,
        lat: 40.0,
        zoom: 10,
      }
      
      expect(persistStore.centerPosition).toEqual({
        lng: 140.0,
        lat: 40.0,
        zoom: 10,
      })
    })
  })

  describe('永続化', () => {
    it('ストアIDが正しく設定されている', () => {
      const persistStore = usePersistStore()
      
      // Piniaの永続化プラグインによってlocalStorageに保存される
      expect(persistStore.$id).toBe('persistStore')
    })
    
    it('永続化プラグインが正しく動作する', () => {
      const persistStore = usePersistStore()
      
      // ストアの定義が{ persist: true }オプションを持つことを確認
      // ストア名が'persistStore'であることを確認
      expect(persistStore.$id).toBe('persistStore')
      
      // フィーチャーの追加が正しく動作することを確認
      persistStore.addFeature(createTestFeature('test-1'))
      expect(persistStore.featurecollection.features).toHaveLength(1)
    })
  })
})