import { describe, it, expect, vi, beforeAll } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import SidebarExportVfm from '@/views/create-variable-fertilization/SidebarExportVfm.vue'

// useControlScreenWidthのモック
vi.mock('@/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: vi.fn(() => ({
    isDesktop: true,
  })),
}))

// ストアのモック（Pinia経由以外）
vi.mock('@/stores/store', () => ({
  useStore: vi.fn(() => ({
    isLoading: false,
    alertMessage: {
      alertType: '',
      message: '',
    },
  })),
}))

// persistStore のモック
vi.mock('@/stores/persistStore', () => ({
  usePersistStore: vi.fn(() => ({
    variableFertilizationMaps: [],
    addVariableFertilizationMap: vi.fn(),
  })),
}))

// 環境変数のモック
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'https://api.example.com',
      VITE_AWS_APIGATEWAY_KEY: 'test-api-key',
    },
  },
})

describe('SidebarExportVfm', () => {
  const defaultProps = {
    area: 1000,
    step3Status: 'current',
    baseFertilizationAmount: 100,
    variableFertilizationRangeRate: 20,
    applicationGridFeatures: [{ type: 'Feature', properties: {}, geometry: {} }],
    totalAmount: 500,
    'onUpdate:area': vi.fn(),
    'onUpdate:step3Status': vi.fn(),
    'onUpdate:baseFertilizationAmount': vi.fn(),
    'onUpdate:variableFertilizationRangeRate': vi.fn(),
    'onUpdate:applicationGridFeatures': vi.fn(),
    'onUpdate:totalAmount': vi.fn(),
  }

  describe('基本的なレンダリング', () => {
    it('正しくマウントされる', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: defaultProps,
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('StepStatusHeaderとInputNumberDialogコンポーネントが含まれる', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: defaultProps,
      })

      expect(wrapper.html()).toContain('step-status-header-stub')
      expect(wrapper.html()).toContain('input-number-dialog-stub')
    })

    it('基本的なテキストが表示される', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: defaultProps,
      })

      expect(wrapper.text()).toContain('基準施肥量および可変量を入力')
      expect(wrapper.text()).toContain('基準施肥量')
      expect(wrapper.text()).toContain('可変施肥増減率(%)')
    })
  })

  describe('プロパティの動作', () => {
    it('baseFertilizationAmountが正しく表示される', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: {
          ...defaultProps,
          baseFertilizationAmount: 150,
        },
      })

      // 値が正しく表示されているかを確認
      const html = wrapper.html()
      expect(html).toContain('value="150"')
    })

    it('合計施肥量が表示される', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: {
          ...defaultProps,
          totalAmount: 523.7,
        },
      })

      expect(wrapper.text()).toContain('524 kg')
    })

    it('概算面積が表示される', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: {
          ...defaultProps,
          area: 1234,
        },
      })

      expect(wrapper.text()).toContain('12 a')
    })
  })

  describe('イベント処理', () => {
    it('戻るボタンがクリック可能', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: defaultProps,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      expect(buttons[0].text()).toContain('戻る')
    })

    it('保存ボタンがクリック可能', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: defaultProps,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons[buttons.length - 1].text()).toContain('保存')
    })
  })

  describe('レスポンシブ表示', () => {
    it('デスクトップではレンジスライダーが表示される', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: defaultProps,
      })

      expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    })

    it('モバイルではcurrent状態で表示される', async () => {
      const { useControlScreenWidth } = await import('@/composables/useControlScreenWidth')
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: false,
        isMobile: true,
        screenWidth: 375,
      })

      const wrapper = shallowMount(SidebarExportVfm, {
        props: {
          ...defaultProps,
          step3Status: 'current',
        },
      })

      expect(wrapper.find('.grid-cols-1').exists()).toBe(true)
    })
  })

  describe('ステップ状態による表示', () => {
    it('current状態でコンテンツが展開される', () => {
      const wrapper = shallowMount(SidebarExportVfm, {
        props: {
          ...defaultProps,
          step3Status: 'current',
        },
      })

      const contentArea = wrapper.find('[class*="px-5"]')
      expect(contentArea.classes()).toContain('max-h-96')
    })
  })
})
