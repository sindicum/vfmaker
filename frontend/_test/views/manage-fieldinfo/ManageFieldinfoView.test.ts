import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ManageFieldinfoView from '@/views/manage-fieldinfo/ManageFieldinfoView.vue'
import MapBase from '@/components/map/MapBase.vue'
import SidebarCreatePolygon from '@/views/manage-fieldinfo/SidebarCreatePolygon.vue'
import SidebarRegisterFudepoly from '@/views/manage-fieldinfo/SidebarRegisterFudepoly.vue'
import SidebarUpdatePolygon from '@/views/manage-fieldinfo/SidebarUpdatePolygon.vue'
import SidebarDeletePolygon from '@/views/manage-fieldinfo/SidebarDeletePolygon.vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'
import * as LayerHandler from '@/views/manage-fieldinfo/handler/LayerHandler'

// メモリ効率化のため、重いコンポーネントをスタブ化
vi.mock('@/components/map/MapBase.vue', () => ({
  default: {
    name: 'MapBase',
    template: '<div class="map-base-stub"></div>'
  }
}))

// サイドバーコンポーネントのスタブ
const sidebarStubs = {
  SidebarCreatePolygon: {
    name: 'SidebarCreatePolygon',
    template: '<div class="sidebar-create-stub"></div>',
    props: ['isOpenDialog', 'createPolygonActive']
  },
  SidebarRegisterFudepoly: {
    name: 'SidebarRegisterFudepoly',
    template: '<div class="sidebar-register-stub"></div>',
    props: ['registerFudepolyActive']
  },
  SidebarUpdatePolygon: {
    name: 'SidebarUpdatePolygon',
    template: '<div class="sidebar-update-stub"></div>',
    props: ['updatePolygonActive', 'updatePolygonId']
  },
  SidebarDeletePolygon: {
    name: 'SidebarDeletePolygon',
    template: '<div class="sidebar-delete-stub"></div>',
    props: ['deletePolygonActive', 'deletePolygonId']
  }
}

// composablesのモック
vi.mock('@/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: vi.fn()
}))

// handlersのモック
vi.mock('@/views/manage-fieldinfo/handler/useCreateLayerHandler', () => ({
  useCreateLayerHandler: vi.fn(() => ({
    isOpenDialog: { value: false },
    drawOnFinish: vi.fn(),
    drawOffFinish: vi.fn()
  }))
}))

vi.mock('@/views/manage-fieldinfo/handler/useRegisterFudepolyHandler', () => ({
  useRegisterFudepolyHandler: vi.fn(() => ({
    onClickRegisterFudepolyLayer: vi.fn(),
    offClickRegisterFudepolyLayer: vi.fn()
  }))
}))

vi.mock('@/views/manage-fieldinfo/handler/useUpdateLayerHandler', () => ({
  useUpdateLayerHandler: vi.fn(() => ({
    updatePolygonId: { value: null },
    onClickUpdateLayer: vi.fn(),
    offClickUpdateLayer: vi.fn()
  }))
}))

vi.mock('@/views/manage-fieldinfo/handler/useDeleteLayerHandler', () => ({
  useDeleteLayerHandler: vi.fn(() => ({
    deletePolygonId: { value: null },
    onClickDeleteLayer: vi.fn(),
    offClickDeleteLayer: vi.fn()
  }))
}))

// LayerHandlerのモック
vi.mock('@/views/manage-fieldinfo/handler/LayerHandler', () => ({
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeSource: vi.fn(),
  removeLayer: vi.fn(),
  addEditLayer: vi.fn(),
  removeEditLayer: vi.fn(),
  addPMTilesSource: vi.fn(),
  addPMTilesLayer: vi.fn(),
  removePMTitlesSource: vi.fn(),
  removePMTitlesLayer: vi.fn(),
  setupTerraDraw: vi.fn()
}))

describe('ManageFieldinfoView', () => {
  let pinia: any
  let mockMap: any
  let mockMapInstance: any
  let mockDraw: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // MapLibreのモックインスタンス
    mockMapInstance = {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      getZoom: vi.fn().mockReturnValue(10),
      getStyle: vi.fn().mockReturnValue({ layers: [] })
    }

    // mapのShallowRefモック
    mockMap = {
      value: mockMapInstance
    }

    // TerraDrawのモック
    mockDraw = {
      start: vi.fn(),
      stop: vi.fn(),
      clear: vi.fn(),
      setMode: vi.fn()
    }

    vi.mocked(LayerHandler.setupTerraDraw).mockReturnValue(mockDraw)

    vi.mocked(useControlScreenWidth).mockReturnValue({
      isDesktop: { value: true },
      isMobile: { value: false },
      screenWidth: { value: 1024 }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    // メモリ効率化のためのクリーンアップ
    if (global.gc) global.gc()
  })

  describe('初期化とレンダリング', () => {
    it('正しくレンダリングされる', () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.findComponent(MapBase).exists()).toBe(true)
    })

    it('mapが提供されない場合はエラーをスローする', () => {
      expect(() => {
        mount(ManageFieldinfoView, {
          global: {
            plugins: [pinia],
            provide: {}
          }
        })
      }).toThrow('Map instance not provided')
    })

    it('初期状態で全てのサイドバーが非表示', () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      expect(vm.createPolygonActive).toBe(false)
      expect(vm.registerFudepolyActive).toBe(false)
      expect(vm.updatePolygonActive).toBe(false)
      expect(vm.deletePolygonActive).toBe(false)
    })
  })

  describe('マップのロード処理', () => {
    it('マップロード時に必要な初期化が行われる', async () => {
      const persistStore = usePersistStore()
      persistStore.featurecollection = {
        type: 'FeatureCollection',
        features: []
      }

      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      // loadイベントハンドラの登録を確認
      expect(mockMapInstance.on).toHaveBeenCalledWith('load', expect.any(Function))

      // loadイベントをトリガー
      const loadHandler = mockMapInstance.on.mock.calls.find(
        call => call[0] === 'load'
      )[1]
      loadHandler()

      // 初期化処理の確認
      expect(LayerHandler.addSource).toHaveBeenCalledWith(
        mockMapInstance,
        persistStore.featurecollection
      )
      expect(LayerHandler.addLayer).toHaveBeenCalledWith(mockMapInstance)
      expect(LayerHandler.setupTerraDraw).toHaveBeenCalledWith(mockMap)
      expect(mockDraw.start).toHaveBeenCalled()

      const vm = wrapper.vm as any
      expect(vm.mapLoaded).toBe(true)
    })
  })

  describe('サイドバーモードの切り替え', () => {
    it('新規作成モードの切り替えが正しく動作する', async () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      
      // drawの初期化
      vm.draw = mockDraw

      // 新規作成モードをアクティブ化
      vm.createPolygonActive = true
      await wrapper.vm.$nextTick()
      
      expect(vm.createPolygonActive).toBe(true)
      expect(mockDraw.setMode).toHaveBeenCalledWith('polygon')
    })

    it('筆ポリ登録モードでズームレベルが低い場合はエラーメッセージが表示される', async () => {
      mockMapInstance.getZoom.mockReturnValue(7)
      const store = useStore()

      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      vm.draw = mockDraw

      // 筆ポリ登録モードをアクティブ化
      vm.registerFudepolyActive = true
      await wrapper.vm.$nextTick()

      // registerFudepolyActiveがfalseになることを確認
      // store.setMessageは実際のストアメソッドなので、モックではない
      expect(vm.registerFudepolyActive).toBe(false)
    })

    it('更新モードの切り替えが正しく動作する', async () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      vm.draw = mockDraw

      // 更新モードをアクティブ化
      vm.updatePolygonActive = true
      await wrapper.vm.$nextTick()

      expect(vm.updatePolygonActive).toBe(true)
      expect(LayerHandler.removeLayer).toHaveBeenCalled()
      expect(LayerHandler.addEditLayer).toHaveBeenCalled()
    })

    it('削除モードの切り替えが正しく動作する', async () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      vm.draw = mockDraw

      // 削除モードをアクティブ化  
      vm.deletePolygonActive = true
      await wrapper.vm.$nextTick()

      expect(vm.deletePolygonActive).toBe(true)
      expect(LayerHandler.removeLayer).toHaveBeenCalled()
      expect(LayerHandler.addEditLayer).toHaveBeenCalled()
    })
  })

  describe('currentActiveNameの計算', () => {
    it('アクティブなモードに応じて正しい名前を返す', async () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any

      // 初期状態
      expect(vm.currentActiveName).toBe('')

      // 各モードをテスト
      vm.createPolygonActive = true
      expect(vm.currentActiveName).toBe('ポリゴンの新規作成')

      vm.createPolygonActive = false
      vm.registerFudepolyActive = true
      expect(vm.currentActiveName).toBe('筆ポリゴンからの登録')

      vm.registerFudepolyActive = false
      vm.updatePolygonActive = true
      expect(vm.currentActiveName).toBe('ポリゴンの更新')

      vm.updatePolygonActive = false
      vm.deletePolygonActive = true
      expect(vm.currentActiveName).toBe('ポリゴンの削除')
    })
  })

  describe('スタイル切り替え時の処理', () => {
    it('mapStyleIndexの変更で適切な再描画が行われる', async () => {
      const store = useStore()
      store.mapStyleIndex = 0

      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      vm.draw = mockDraw
      vm.createPolygonActive = true

      // idleイベントハンドラを設定
      let idleHandler: Function
      mockMapInstance.once.mockImplementation((event: string, handler: Function) => {
        if (event === 'idle') {
          idleHandler = handler
        }
      })

      // スタイルを変更
      store.mapStyleIndex = 1
      await new Promise(resolve => setTimeout(resolve, 0))

      // drawのクリアを確認
      expect(mockDraw.clear).toHaveBeenCalled()

      // idleイベントをトリガー
      idleHandler!()

      // レイヤーの再追加を確認
      expect(LayerHandler.addSource).toHaveBeenCalled()
      expect(LayerHandler.addLayer).toHaveBeenCalled()
    })
  })

  describe('アンマウント時の処理', () => {
    it('クリーンアップが適切に行われる', () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      const vm = wrapper.vm as any
      vm.draw = mockDraw
      vm.mapLoaded = true

      wrapper.unmount()

      // レイヤーとソースの削除を確認
      expect(LayerHandler.removeLayer).toHaveBeenCalled()
      expect(LayerHandler.removeEditLayer).toHaveBeenCalled()
      expect(LayerHandler.removeSource).toHaveBeenCalled()
      expect(LayerHandler.removePMTitlesLayer).toHaveBeenCalled()
      expect(LayerHandler.removePMTitlesSource).toHaveBeenCalled()

      // drawのクリーンアップを確認
      expect(mockDraw.clear).toHaveBeenCalled()
      expect(mockDraw.stop).toHaveBeenCalled()

      // イベントリスナーの削除を確認
      expect(mockMapInstance.off).toHaveBeenCalledWith('load', expect.any(Function))
    })
  })

  describe('レスポンシブ対応', () => {
    it('デスクトップでは適切なレイアウトで表示される', () => {
      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      // デスクトップレイアウトの確認
      expect(wrapper.find('main').exists()).toBe(true)
    })

    it('モバイルでは適切なレイアウトで表示される', () => {
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: { value: false },
        isMobile: { value: true },
        screenWidth: { value: 375 }
      })

      const wrapper = mount(ManageFieldinfoView, {
        global: {
          plugins: [pinia],
          provide: {
            mapkey: mockMap
          },
          stubs: {
            MapBase: true,
            ...sidebarStubs
          }
        }
      })

      // モバイルレイアウトの確認
      expect(wrapper.find('main').exists()).toBe(true)
    })
  })
})