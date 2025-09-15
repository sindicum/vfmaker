import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '@/views/home/HomeView.vue'
import MapBase from '@/components/map/MapBase.vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { useHumusCog } from '@/composables/useHumusCog'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'
import * as LayerHandler from '@/views/create-variable-fertilization/handler/LayerHandler'

// メモリ効率化のため、重いコンポーネントをスタブ化
vi.mock('@/components/map/MapBase.vue', () => ({
  default: {
    name: 'MapBase',
    template: '<div class="map-base-stub"></div>',
  },
}))

// composablesのモック
vi.mock('@/composables/useHumusCog', () => ({
  useHumusCog: vi.fn(),
}))

vi.mock('@/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: vi.fn(),
}))

// LayerHandlerのモック
vi.mock('@/views/create-variable-fertilization/handler/LayerHandler', () => ({
  addLayer: vi.fn(),
  addSource: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
}))

describe('HomeView', () => {
  let pinia: ReturnType<typeof createPinia>
  let mockAddCog: ReturnType<typeof vi.fn>
  let mockMap: { value: Record<string, ReturnType<typeof vi.fn>> | null }
  let mockMapInstance: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // MapLibreのモックインスタンス
    mockMapInstance = {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      getStyle: vi.fn().mockReturnValue({ layers: [] }),
      getLayer: vi.fn(),
      moveLayer: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
    }

    // mapのShallowRefモック
    mockMap = {
      value: mockMapInstance,
    }

    // composableのモック設定
    mockAddCog = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useHumusCog).mockReturnValue({
      addCog: mockAddCog,
      removeCog: vi.fn(),
    })

    vi.mocked(useControlScreenWidth).mockReturnValue({
      isDesktop: { value: true } as any,
      isMobile: { value: false } as any,
      screenWidth: { value: 1024 } as any,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    // メモリ効率化のためのクリーンアップ
    if (global.gc) global.gc()
  })

  describe('初期化とレンダリング', () => {
    it('正しくレンダリングされる', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.findComponent(MapBase).exists()).toBe(true)
      // expect(wrapper.findComponent(HumusMapLegend).exists()).toBe(true)
    })

    it('コンポーネントが正しく配置される', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      const mapBase = wrapper.findComponent(MapBase)
      expect(mapBase.exists()).toBe(true)
      // MapBaseが存在することを確認
    })

    it('mapが提供されない場合でもエラーにならない', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: { value: null },
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('マウント時の処理', () => {
    it('style.loadイベントでCOGレイヤーと圃場データが追加される', async () => {
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: [],
      }

      mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      // style.loadイベントハンドラの登録を確認
      expect(mockMapInstance.on).toHaveBeenCalledWith('style.load', expect.any(Function))

      // style.loadイベントをトリガー
      const styleLoadHandler = mockMapInstance.on.mock.calls.find(
        (call) => call[0] === 'style.load',
      )?.[1]
      expect(styleLoadHandler).toBeDefined()
      await styleLoadHandler!()

      // COGレイヤーの追加を確認
      expect(mockAddCog).toHaveBeenCalled()

      // 圃場データソースとレイヤーの追加を確認
      expect(LayerHandler.addSource).toHaveBeenCalledWith(
        mockMapInstance,
        persistStore.featurecollection,
      )
      expect(LayerHandler.addLayer).toHaveBeenCalledWith(mockMapInstance)
    })

    it('mapがnullの場合は処理をスキップする', () => {
      mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: { value: null },
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      expect(mockAddCog).not.toHaveBeenCalled()
      expect(LayerHandler.addSource).not.toHaveBeenCalled()
    })
  })

  describe('アンマウント時の処理', () => {
    it('レイヤー・ソース・COGが全て削除される', () => {
      const mockRemoveCog = vi.fn()
      vi.mocked(useHumusCog).mockReturnValue({
        addCog: mockAddCog,
        removeCog: mockRemoveCog,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      // コンポーネントをアンマウント
      wrapper.unmount()

      // アンマウント時の処理を確認
      expect(LayerHandler.removeLayer).toHaveBeenCalledWith(mockMapInstance)
      expect(LayerHandler.removeSource).toHaveBeenCalledWith(mockMapInstance)
      expect(mockRemoveCog).toHaveBeenCalled()
    })

    it('mapがnullの場合はクリーンアップ処理をスキップする', () => {
      const mockRemoveCog = vi.fn()
      vi.mocked(useHumusCog).mockReturnValue({
        addCog: mockAddCog,
        removeCog: mockRemoveCog,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: { value: null },
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      wrapper.unmount()

      expect(LayerHandler.removeLayer).not.toHaveBeenCalled()
      expect(LayerHandler.removeSource).not.toHaveBeenCalled()
      expect(mockRemoveCog).not.toHaveBeenCalled() // mapがnullなのでremoveCogは呼ばれない
    })
  })

  describe('スタイル切り替え時の処理', () => {
    it('idleイベント時にisCogLayerVisibleがtrueなら再描画する', async () => {
      const store = useStore()
      store.mapStyleIndex = 0

      mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      // モックをクリアしてスタイル変更をテスト
      vi.clearAllMocks()

      // スタイルを変更
      store.mapStyleIndex = 1

      // Vueの更新サイクルを待つ
      await new Promise((resolve) => setTimeout(resolve, 0))

      // onceイベントハンドラーを取得
      expect(mockMapInstance.once).toHaveBeenCalledWith('idle', expect.any(Function))
      const idleHandler = mockMapInstance.once.mock.calls.find((call) => call[0] === 'idle')?.[1]
      expect(idleHandler).toBeDefined()

      // idleイベントをトリガー
      await idleHandler!()

      // 再描画処理の確認
      expect(mockAddCog).toHaveBeenCalled()
      expect(LayerHandler.addSource).toHaveBeenCalledWith(mockMapInstance, expect.any(Object))
      expect(LayerHandler.addLayer).toHaveBeenCalledWith(mockMapInstance)
    })

    it('idleイベント時にisCogLayerVisibleがfalseなら再描画しない', async () => {
      const store = useStore()
      store.mapStyleIndex = 0

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      // コンポーネント内部のisCogLayerVisibleをfalseに設定
      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }
      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()

      // モックをクリアしてスタイル変更をテスト
      vi.clearAllMocks()
      store.mapStyleIndex = 1

      // Vueの更新サイクルを待つ
      await new Promise((resolve) => setTimeout(resolve, 0))

      // onceイベントハンドラーを取得
      expect(mockMapInstance.once).toHaveBeenCalledWith('idle', expect.any(Function))
      const idleHandler = mockMapInstance.once.mock.calls.find((call) => call[0] === 'idle')?.[1]
      expect(idleHandler).toBeDefined()
      await idleHandler!()

      // 再描画処理が実行されないことを確認
      expect(mockAddCog).not.toHaveBeenCalled()
      expect(LayerHandler.addSource).not.toHaveBeenCalled()
      expect(LayerHandler.addLayer).not.toHaveBeenCalled()
    })

    it('mapがnullの場合はスタイル変更を無視する', async () => {
      const store = useStore()
      store.mapStyleIndex = 0

      mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: { value: null },
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      // スタイルを変更
      store.mapStyleIndex = 1
      await new Promise((resolve) => setTimeout(resolve, 0))

      // onceイベントハンドラーが登録されないことを確認
      expect(mockMapInstance.once).not.toHaveBeenCalled()
    })
  })

  describe('COGレイヤーの表示切り替え', () => {
    it('isCogLayerVisibleの状態が正しく管理される', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      // 初期状態の確認
      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }
      expect(vm.isCogLayerVisible).toBe(true)

      // 状態変更をシミュレート
      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()

      expect(vm.isCogLayerVisible).toBe(false)
    })

    it('isCogLayerVisibleをfalseにするとremoveCogが呼ばれる', async () => {
      const mockRemoveCog = vi.fn()
      vi.mocked(useHumusCog).mockReturnValue({
        addCog: mockAddCog,
        removeCog: mockRemoveCog,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      // falseに変更
      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()

      expect(mockRemoveCog).toHaveBeenCalled()
    })

    it('isCogLayerVisibleをtrueにするとaddCogが呼ばれる', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      // 一度falseにしてからtrueに変更
      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()
      vi.clearAllMocks()

      vm.isCogLayerVisible = true
      await wrapper.vm.$nextTick()

      expect(mockAddCog).toHaveBeenCalled()
    })

    it('registeredFillLayerが存在する場合はmoveLayerが呼ばれる', async () => {
      mockMapInstance.getLayer.mockReturnValue({ id: 'registeredFillLayer' })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()
      vi.clearAllMocks()

      vm.isCogLayerVisible = true
      await wrapper.vm.$nextTick()

      expect(mockMapInstance.moveLayer).toHaveBeenCalledWith('cogLayer', 'registeredFillLayer')
    })

    it('registeredFillLayerが存在しない場合はmoveLayerを呼ばない', async () => {
      mockMapInstance.getLayer.mockReturnValue(null)

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      vm.isCogLayerVisible = true
      await wrapper.vm.$nextTick()

      expect(mockMapInstance.moveLayer).not.toHaveBeenCalled()
    })

    it('mapがnullの場合はCOG処理をスキップする', async () => {
      const mockRemoveCog = vi.fn()
      vi.mocked(useHumusCog).mockReturnValue({
        addCog: mockAddCog,
        removeCog: mockRemoveCog,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: { value: null },
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()

      // mapがnullなのでaddCog/removeCogは呼ばれない
      expect(mockAddCog).not.toHaveBeenCalled()
      expect(mockRemoveCog).not.toHaveBeenCalled()
    })
  })

  describe('レスポンシブ対応', () => {
    it('デスクトップでは凡例が右側に表示される', () => {
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: { value: true } as any,
        isMobile: { value: false } as any,
        screenWidth: { value: 1024 } as any,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      // デスクトップでの凡例表示を確認
      const legendWrapper = wrapper.find('.absolute')
      expect(legendWrapper.exists()).toBe(true)
    })

    it('モバイルでは凡例が下部に表示される', () => {
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: { value: false } as any,
        isMobile: { value: true } as any,
        screenWidth: { value: 375 } as any,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      // モバイルでの凡例表示を確認
      const legendWrapper = wrapper.find('.fixed')
      expect(legendWrapper.exists()).toBe(true)
    })
  })

  describe('UIの相互作用', () => {
    it('チェックボックスをクリックするとisCogLayerVisibleが切り替わる', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)

      // チェックボックスのクリックをシミュレート
      await checkbox.setValue(false)

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }
      expect(vm.isCogLayerVisible).toBe(false)
    })

    it('isCogLayerVisibleがtrueの時は腐植マップ凡例が表示される', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      // 初期状態（true）では凡例が表示
      expect(wrapper.find('.text-xs').exists()).toBe(true)
      expect(wrapper.text()).toContain('0')
      expect(wrapper.text()).toContain('150mg/kg')
    })

    it('isCogLayerVisibleがfalseの時は腐植マップ凡例が非表示', async () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      // falseに変更
      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()

      // 凡例が非表示
      expect(wrapper.find('.text-xs').exists()).toBe(false)
    })

    it('腐植マップ表示チェックボックスのラベルが正しく表示される', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      expect(wrapper.text()).toContain('腐植マップ表示')
    })
  })

  describe('エラーハンドリング', () => {
    it('COGレイヤー追加時のエラーが適切に処理される', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAddCog.mockRejectedValue(new Error('COG load error'))

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
            // HumusMapLegend: true,
          },
        },
      })

      // style.loadイベントをトリガー
      const styleLoadHandler = mockMapInstance.on.mock.calls.find(
        (call) => call[0] === 'style.load',
      )?.[1]
      expect(styleLoadHandler).toBeDefined()

      // エラーが発生してもクラッシュしないことを確認
      await expect(styleLoadHandler!()).rejects.toThrow('COG load error')

      expect(mockAddCog).toHaveBeenCalled()
      // エラーが発生したが、コンポーネントはマウントされたまま
      expect(wrapper.exists()).toBe(true)

      consoleErrorSpy.mockRestore()
    })

    it('moveLayerでエラーが発生してもクラッシュしない', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockMapInstance.getLayer.mockReturnValue({ id: 'registeredFillLayer' })
      mockMapInstance.moveLayer.mockImplementation(() => {
        throw new Error('moveLayer error')
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      // エラーが発生してもクラッシュしない
      expect(() => {
        vm.isCogLayerVisible = true
      }).not.toThrow()

      expect(wrapper.exists()).toBe(true)
      consoleErrorSpy.mockRestore()
    })

    it('removeCogエラー時でもコンポーネントは安定している', async () => {
      const mockRemoveCog = vi.fn().mockRejectedValue(new Error('removeCog error'))

      vi.mocked(useHumusCog).mockReturnValue({
        addCog: mockAddCog,
        removeCog: mockRemoveCog,
      })

      const wrapper = mount(HomeView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap,
          },
          stubs: {
            MapBase: true,
          },
        },
      })

      const vm = wrapper.vm as unknown as { isCogLayerVisible: boolean }

      // エラーが発生してもコンポーネントは正常に動作
      vm.isCogLayerVisible = false
      await wrapper.vm.$nextTick()

      // エラーが発生したがコンポーネントは存在し続ける
      expect(wrapper.exists()).toBe(true)
      expect(mockRemoveCog).toHaveBeenCalled()
    })
  })
})
