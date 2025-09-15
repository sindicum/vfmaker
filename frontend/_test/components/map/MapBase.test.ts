import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import MapBase from '@/components/map/MapBase.vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'

// MapLibre GLのモック
const mockMapInstance = {
  on: vi.fn(),
  off: vi.fn(),
  remove: vi.fn(),
  addControl: vi.fn(),
  setStyle: vi.fn(),
  getCenter: vi.fn().mockReturnValue({ lat: 35.0, lng: 139.0 }),
  getZoom: vi.fn().mockReturnValue(10),
  getSource: vi.fn(),
}

// URL.createObjectURLのモック
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(),
  },
  writable: true,
})

vi.mock('maplibre-gl', () => ({
  Map: vi.fn().mockImplementation(() => mockMapInstance),
  NavigationControl: vi.fn(),
  ScaleControl: vi.fn(),
  GeolocateControl: vi.fn(),
}))

// Composablesのモック
const mockHandleError = vi.fn()
vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}))

vi.mock('@/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: () => ({
    isDesktop: ref(true),
  }),
}))

vi.mock('@/composables/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: ref(true),
  }),
}))

// 環境変数のモック
vi.stubEnv('VITE_MAPTILER_KEY', 'test-maptiler-key')

describe('MapBase', () => {
  let store: ReturnType<typeof useStore>
  let persistStore: ReturnType<typeof usePersistStore>
  let mockMapRef: ReturnType<typeof ref>

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useStore()
    persistStore = usePersistStore()
    
    // マップ参照のモック
    mockMapRef = ref(null)
    
    // 初期状態の設定
    store.mapStyleIndex = 0
    store.mapLoaded = false
    store.isLoading = false
    
    persistStore.centerPosition = {
      lat: 35.0,
      lng: 139.0,
      zoom: 10,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初期化とレンダリング', () => {
    it('コンポーネントが正しくレンダリングされる', () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      expect(wrapper.find('.relative.h-full.w-full').exists()).toBe(true)
      expect(wrapper.find('fieldset[role="radiogroup"]').exists()).toBe(true)
    })

    it('地図スタイル選択のラジオボタンが表示される', () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      expect(radioInputs).toHaveLength(2) // Open Street Map と MapTiler

      // ラベルテキストの確認
      expect(wrapper.text()).toContain('Open Street Map')
      expect(wrapper.text()).toContain('MapTiler')
    })

    it('mapkey injectionが提供されない場合はエラーが発生する', () => {
      expect(() => {
        mount(MapBase, {
          global: {
            provide: {},
          },
        })
      }).toThrow('Map instance not provided')
    })
  })

  describe('地図スタイルの選択', () => {
    it('地図スタイルの選択が正しく動作する', async () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      
      // 最初は0番目が選択されている
      expect((radioInputs[0].element as HTMLInputElement).checked).toBe(true)
      expect((radioInputs[1].element as HTMLInputElement).checked).toBe(false)

      // 2番目を選択
      await radioInputs[1].setValue(true)
      
      expect(store.mapStyleIndex).toBe(1)
    })

    it('mapStyleIndexの変更でスタイルが更新される', async () => {
      mockMapRef.value = mockMapInstance
      
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      // スタイルインデックスを変更
      store.mapStyleIndex = 1
      await wrapper.vm.$nextTick()

      expect(mockMapInstance.setStyle).toHaveBeenCalledWith(
        `https://api.maptiler.com/maps/hybrid/style.json?key=test-maptiler-key`,
        { diff: true }
      )
      expect(store.isLoading).toBe(true)
    })
  })

  describe('ネットワーク状態の表示', () => {
    it('オンライン時はネットワークインジケーターが表示されない', () => {
      vi.doMock('@/composables/useNetworkStatus', () => ({
        useNetworkStatus: () => ({
          isOnline: ref(true),
        }),
      }))

      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      expect(wrapper.find('.bg-red-500').exists()).toBe(false)
    })

    it('オフライン時はネットワークインジケーターが表示される', async () => {
      vi.doMock('@/composables/useNetworkStatus', () => ({
        useNetworkStatus: () => ({
          isOnline: ref(false),
        }),
      }))

      // モジュールを再インポート
      vi.resetModules()
      const { default: MapBaseModule } = await import('@/components/map/MapBase.vue')

      const wrapper = mount(MapBaseModule, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      expect(wrapper.find('.bg-red-500').exists()).toBe(true)
      expect(wrapper.text()).toContain('オフライン')
    })

    it('オフライン時はラジオボタンが無効化される', async () => {
      vi.doMock('@/composables/useNetworkStatus', () => ({
        useNetworkStatus: () => ({
          isOnline: ref(false),
        }),
      }))

      // モジュールを再インポート
      vi.resetModules()
      const { default: MapBaseModule } = await import('@/components/map/MapBase.vue')

      const wrapper = mount(MapBaseModule, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      radioInputs.forEach(input => {
        expect((input.element as HTMLInputElement).disabled).toBe(true)
      })
    })
  })

  describe('レスポンシブデザイン', () => {
    it('デスクトップ時とモバイル時でスタイルが切り替わる', () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      // 地図スタイル選択パネルのクラスを確認
      const stylePanel = wrapper.find('.absolute.bottom-10.right-2')
      expect(stylePanel.exists()).toBe(true)
      expect(stylePanel.classes()).toContain('lg:top-2')
      expect(stylePanel.classes()).toContain('lg:left-2')

      // ラジオボタンのグリッドレイアウト
      const gridContainer = wrapper.find('.grid.grid-cols-2.lg\\:grid-cols-1')
      expect(gridContainer.exists()).toBe(true)
    })
  })

  describe('地図の位置管理', () => {
    it('マップインスタンスが作成される際に適切なオプションが設定される', async () => {
      const MapConstructor = vi.fn().mockImplementation(() => mockMapInstance)
      vi.doMock('maplibre-gl', () => ({
        Map: MapConstructor,
        NavigationControl: vi.fn(),
        ScaleControl: vi.fn(),
        GeolocateControl: vi.fn(),
      }))

      // モジュールを再インポート
      vi.resetModules()
      const { default: MapBaseModule } = await import('@/components/map/MapBase.vue')
      
      mount(MapBaseModule, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      expect(MapConstructor).toHaveBeenCalledWith({
        container: expect.any(HTMLElement),
        style: 'https://tile.openstreetmap.jp/styles/maptiler-basic-ja/style.json',
        center: [139.0, 35.0],
        zoom: 10,
        hash: true,
      })
    })

    it('地図のコントロールが追加される', () => {
      mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      // ScaleControl、NavigationControl、GeolocateControlが追加される
      expect(mockMapInstance.addControl).toHaveBeenCalledTimes(3)
    })
  })

  describe('エラーハンドリング', () => {
    it('地図のエラーイベントが適切にハンドリングされる', () => {
      mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      // errorイベントリスナーが登録される
      expect(mockMapInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('スタイル変更時のエラーが適切にハンドリングされる', async () => {
      mockMapRef.value = mockMapInstance
      mockMapInstance.setStyle.mockImplementation(() => {
        throw new Error('Style change error')
      })

      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      // スタイル変更を実行
      store.mapStyleIndex = 1
      await wrapper.vm.$nextTick()

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'network',
          severity: 'medium',
          message: expect.stringContaining('地図エラー: style_change'),
          context: expect.objectContaining({
            operation: 'style_change',
            newStyleIndex: 1,
          }),
        })
      )
      expect(store.isLoading).toBe(false)
    })
  })

  describe('ライフサイクル', () => {
    it('コンポーネントがアンマウントされる際にクリーンアップが実行される', () => {
      mockMapRef.value = mockMapInstance

      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      wrapper.unmount()

      expect(mockMapInstance.off).toHaveBeenCalledWith('moveend', expect.any(Function))
      expect(mockMapInstance.remove).toHaveBeenCalled()
      expect(mockMapRef.value).toBe(null)
    })
  })

  describe('アクセシビリティ', () => {
    it('ラジオグループが適切なARIA属性を持っている', () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      const fieldset = wrapper.find('fieldset')
      expect(fieldset.attributes('role')).toBe('radiogroup')

      const radioInputs = wrapper.findAll('input[type="radio"]')
      radioInputs.forEach(input => {
        expect(input.attributes('role')).toBe('radio')
      })
    })

    it('ラジオボタンのラベルが適切に関連付けられている', () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      const labels = wrapper.findAll('label')
      const radioInputs = wrapper.findAll('input[type="radio"]')

      expect(labels).toHaveLength(2)
      expect(radioInputs).toHaveLength(2)

      // 各ラベルが対応するinput要素を含んでいることを確認
      labels.forEach((label, index) => {
        expect(label.find('input[type="radio"]').exists()).toBe(true)
      })
    })
  })

  describe('スタイル適用', () => {
    it('ネットワーク状態に応じてテキストカラーが変更される', async () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      // オンライン時のテキストカラー
      const labelDivs = wrapper.findAll('.ml-3.text-xs.lg\\:text-sm')
      labelDivs.forEach(div => {
        expect(div.classes()).toContain('text-gray-900')
      })
    })

    it('地図コンテナが適切なクラスを持っている', () => {
      const wrapper = mount(MapBase, {
        global: {
          provide: {
            mapkey: mockMapRef,
          },
        },
      })

      const mapContainer = wrapper.find('.relative.h-full.w-full.z-0')
      expect(mapContainer.exists()).toBe(true)
    })
  })
})