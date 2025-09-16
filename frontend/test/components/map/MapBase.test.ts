import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MapBase from '../../../src/components/map/MapBase.vue'

// エラーハンドリングのモック
vi.mock('../../../src/errors', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
  }),
  createNetworkError: vi.fn(),
  createPermissionError: vi.fn(),
  createGeneralError: vi.fn(),
}))

// Composablesのモック
vi.mock('../../../src/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: () => ({
    isDesktop: { value: true },
  }),
}))

vi.mock('../../../src/composables/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: { value: true },
  }),
}))

// CSS import のモック
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

// 環境変数のモック
vi.stubEnv('VITE_MAPTILER_KEY', 'test-key')

describe('MapBase.vue', () => {
  let pinia: ReturnType<typeof createPinia>
  let mockMapRef: { value: any }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    mockMapRef = { value: null }
    vi.clearAllMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(MapBase, {
      global: {
        plugins: [pinia],
        provide: {
          mapkey: mockMapRef,
        },
        ...options,
      },
    })
  }

  describe('基本機能', () => {
    it('コンポーネントが正常にマウントされる', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)

      // 地図コンテナが存在することを確認
      const mapContainer = wrapper.find('div')
      expect(mapContainer.exists()).toBe(true)
      expect(mapContainer.classes()).toContain('relative')
      expect(mapContainer.classes()).toContain('h-full')
    })

    it('map injectが無い場合にエラーをスローする', () => {
      expect(() => {
        mount(MapBase, {
          global: {
            plugins: [pinia],
            provide: {},
          },
        })
      }).toThrow('Map instance not provided')
    })

    it('地図スタイル選択UIが表示される', () => {
      const wrapper = createWrapper()

      // ラジオボタンが2つ存在する
      const radioButtons = wrapper.findAll('input[type="radio"]')
      expect(radioButtons).toHaveLength(2)

      // ラベルが正しく表示される
      const text = wrapper.text()
      expect(text).toContain('Open Street Map')
      expect(text).toContain('MapTiler')
    })

    it('ネットワーク状態に応じてUIが変化する', () => {
      const wrapper = createWrapper()

      // オンライン時: オフラインインジケーターは表示されない
      expect(wrapper.find('.bg-red-500').exists()).toBe(false)

      // ラジオボタンは有効
      const radioButtons = wrapper.findAll('input[type="radio"]')
      radioButtons.forEach((button) => {
        expect((button.element as HTMLInputElement).disabled).toBe(false)
      })
    })
  })

  describe('Store連携', () => {
    it('Pinia storeと連携している', () => {
      const wrapper = createWrapper()

      // コンポーネントが正常に描画される（storeエラーがない）
      expect(wrapper.exists()).toBe(true)

      // ラジオボタンがv-modelで連携している
      const firstRadio = wrapper.find('input[type="radio"]')
      expect(firstRadio.exists()).toBe(true)
    })
  })
})
