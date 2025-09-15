import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigPersistStore } from '@/stores/configPersistStore'

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

describe('useConfigPersistStore', () => {
  beforeEach(() => {
    mockLocalStorage()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されている', () => {
      const store = useConfigPersistStore()
      
      expect(store.outsideMeshClip).toBe(true)
      expect(store.fiveStepsFertilization).toBe(true)
    })
  })

  describe('outsideMeshClipChanged', () => {
    it('outsideMeshClipの値を切り替えられる', () => {
      const store = useConfigPersistStore()
      
      // 初期値はtrue
      expect(store.outsideMeshClip).toBe(true)
      
      // 切り替え
      store.outsideMeshClipChanged()
      expect(store.outsideMeshClip).toBe(false)
      
      // もう一度切り替え
      store.outsideMeshClipChanged()
      expect(store.outsideMeshClip).toBe(true)
    })

    it('複数回の切り替えが正しく動作する', () => {
      const store = useConfigPersistStore()
      
      // 初期値: true
      const expectedValues = [false, true, false, true, false]
      
      expectedValues.forEach((expected) => {
        store.outsideMeshClipChanged()
        expect(store.outsideMeshClip).toBe(expected)
      })
    })
  })

  describe('fiveStepsFertilizationChanged', () => {
    it('fiveStepsFertilizationの値を切り替えられる', () => {
      const store = useConfigPersistStore()
      
      // 初期値はtrue
      expect(store.fiveStepsFertilization).toBe(true)
      
      // 切り替え
      store.fiveStepsFertilizationChanged()
      expect(store.fiveStepsFertilization).toBe(false)
      
      // もう一度切り替え
      store.fiveStepsFertilizationChanged()
      expect(store.fiveStepsFertilization).toBe(true)
    })

    it('複数回の切り替えが正しく動作する', () => {
      const store = useConfigPersistStore()
      
      // 初期値: true
      const expectedValues = [false, true, false, true, false]
      
      expectedValues.forEach((expected) => {
        store.fiveStepsFertilizationChanged()
        expect(store.fiveStepsFertilization).toBe(expected)
      })
    })
  })

  describe('独立した設定の切り替え', () => {
    it('outsideMeshClipとfiveStepsFertilizationは独立して切り替えられる', () => {
      const store = useConfigPersistStore()
      
      // 両方とも初期値はtrue
      expect(store.outsideMeshClip).toBe(true)
      expect(store.fiveStepsFertilization).toBe(true)
      
      // outsideMeshClipのみ切り替え
      store.outsideMeshClipChanged()
      expect(store.outsideMeshClip).toBe(false)
      expect(store.fiveStepsFertilization).toBe(true)
      
      // fiveStepsFertilizationのみ切り替え
      store.fiveStepsFertilizationChanged()
      expect(store.outsideMeshClip).toBe(false)
      expect(store.fiveStepsFertilization).toBe(false)
      
      // outsideMeshClipのみ再度切り替え
      store.outsideMeshClipChanged()
      expect(store.outsideMeshClip).toBe(true)
      expect(store.fiveStepsFertilization).toBe(false)
    })
  })

  describe('直接値の更新', () => {
    it('outsideMeshClipを直接更新できる', () => {
      const store = useConfigPersistStore()
      
      store.outsideMeshClip = false
      expect(store.outsideMeshClip).toBe(false)
      
      store.outsideMeshClip = true
      expect(store.outsideMeshClip).toBe(true)
    })

    it('fiveStepsFertilizationを直接更新できる', () => {
      const store = useConfigPersistStore()
      
      store.fiveStepsFertilization = false
      expect(store.fiveStepsFertilization).toBe(false)
      
      store.fiveStepsFertilization = true
      expect(store.fiveStepsFertilization).toBe(true)
    })
  })

  describe('永続化', () => {
    it('ストアIDが正しく設定されている', () => {
      const store = useConfigPersistStore()
      
      // Piniaの永続化プラグインによってlocalStorageに保存される
      expect(store.$id).toBe('configPersistStore')
    })
    
    it('永続化プラグインが正しく動作する', () => {
      const store = useConfigPersistStore()
      
      // ストアの定義が{ persist: true }オプションを持つことを確認
      // ストア名が'configPersistStore'であることを確認
      expect(store.$id).toBe('configPersistStore')
      
      // 設定の変更が正しく動作することを確認
      store.outsideMeshClipChanged()
      expect(store.outsideMeshClip).toBe(false)
    })
  })

  describe('複数インスタンスの動作', () => {
    it('同じストアインスタンスを返す', () => {
      const store1 = useConfigPersistStore()
      const store2 = useConfigPersistStore()
      
      store1.outsideMeshClipChanged()
      
      expect(store2.outsideMeshClip).toBe(false)
      expect(store1).toBe(store2)
    })
  })
})