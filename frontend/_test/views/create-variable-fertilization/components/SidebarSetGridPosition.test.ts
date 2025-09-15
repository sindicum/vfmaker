import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import SidebarSetGridPosition from '@/views/create-variable-fertilization/SidebarSetGridPosition.vue'

// useControlScreenWidthのモック
vi.mock('@/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: vi.fn(() => ({
    isDesktop: true,
  })),
}))

describe('SidebarSetGridPosition', () => {
  const defaultProps = {
    step2Status: 'current',
    gridRotationAngle: 0,
    gridEW: 30,
    gridNS: 30,
    buffer: 0,
    'onUpdate:step2Status': vi.fn(),
    'onUpdate:gridRotationAngle': vi.fn(),
    'onUpdate:gridEW': vi.fn(),
    'onUpdate:gridNS': vi.fn(),
    'onUpdate:buffer': vi.fn(),
  }

  describe('基本的なレンダリング', () => {
    it('正しくマウントされる', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('必要なコンポーネントが含まれる', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      expect(wrapper.html()).toContain('step-status-header-stub')
      expect(wrapper.html()).toContain('input-number-dialog-stub')
    })

    it('ラベルが正しく表示される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      expect(wrapper.text()).toContain('回転角度・グリッド幅を調整')
      expect(wrapper.text()).toContain('回転角度(°)')
      expect(wrapper.text()).toContain('グリッド幅EW(m)')
      expect(wrapper.text()).toContain('グリッド幅NS(m)')
      expect(wrapper.text()).toContain('バッファー(m)')
    })
  })

  describe('入力フィールドの表示', () => {
    it('回転角度の値が表示される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          gridRotationAngle: 45,
        },
      })

      // v-showがfalseの場合でも値は表示される
      const html = wrapper.html()
      expect(html).toContain('value="45"')
    })

    it('グリッド幅EWの値が表示される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          gridEW: 25,
        },
      })

      const html = wrapper.html()
      expect(html).toContain('value="25"')
    })

    it('グリッド幅NSの値が表示される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          gridNS: 35,
        },
      })

      const html = wrapper.html()
      expect(html).toContain('value="35"')
    })

    it('バッファーの値が表示される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          buffer: -5,
        },
      })

      const html = wrapper.html()
      expect(html).toContain('value="-5"')
    })
  })

  describe('レンジスライダー', () => {
    it('デスクトップで回転角度のレンジスライダーが表示される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      const rangeInputs = wrapper.findAll('input[type="range"]')
      expect(rangeInputs.length).toBeGreaterThanOrEqual(4)
      expect(rangeInputs[0].attributes('min')).toBe('0')
      expect(rangeInputs[0].attributes('max')).toBe('90')
    })

    it('グリッドEWのレンジスライダーが正しい範囲を持つ', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      const rangeInputs = wrapper.findAll('input[type="range"]')
      expect(rangeInputs[1].attributes('min')).toBe('10')
      expect(rangeInputs[1].attributes('max')).toBe('50')
    })

    it('バッファーのレンジスライダーが負の値を許可する', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      const rangeInputs = wrapper.findAll('input[type="range"]')
      const bufferRange = rangeInputs[rangeInputs.length - 1]
      expect(bufferRange.attributes('min')).toBe('-20')
      expect(bufferRange.attributes('max')).toBe('20')
    })
  })

  describe('ボタン動作', () => {
    it('戻るボタンがクリック可能', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons[0].text()).toContain('戻る')
    })

    it('進むボタンがクリック可能', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: defaultProps,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons[1].text()).toContain('進む')
    })

    it('戻るボタンクリックでステップが変更される', async () => {
      const updateHandler = vi.fn()
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          'onUpdate:step2Status': updateHandler,
        },
      })

      await wrapper.find('button').trigger('click')
      expect(updateHandler).toHaveBeenCalledWith('upcoming')
    })

    it('進むボタンクリックでステップが完了する', async () => {
      const updateHandler = vi.fn()
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          'onUpdate:step2Status': updateHandler,
        },
      })

      const buttons = wrapper.findAll('button')
      await buttons[1].trigger('click')
      expect(updateHandler).toHaveBeenCalledWith('complete')
    })
  })

  describe('レスポンシブ表示', () => {
    it('モバイルでcurrent状態のときのみ表示される', async () => {
      const { useControlScreenWidth } = await import('@/composables/useControlScreenWidth')
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: false,
        isMobile: true,
        screenWidth: 375,
      })

      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          step2Status: 'upcoming',
        },
      })

      expect(wrapper.find('.grid-cols-1').exists()).toBe(false)
    })

    it('モバイルでcurrent状態のとき表示される', async () => {
      const { useControlScreenWidth } = await import('@/composables/useControlScreenWidth')
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: false,
        isMobile: true,
        screenWidth: 375,
      })

      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          step2Status: 'current',
        },
      })

      expect(wrapper.find('.grid-cols-1').exists()).toBe(true)
    })
  })

  describe('ステップ状態による表示', () => {
    it('current状態でコンテンツが展開される', () => {
      const wrapper = shallowMount(SidebarSetGridPosition, {
        props: {
          ...defaultProps,
          step2Status: 'current',
        },
      })

      const contentArea = wrapper.find('[class*="px-5"]')
      expect(contentArea.classes()).toContain('max-h-96')
      expect(contentArea.classes()).toContain('overflow-auto')
    })

  })
})