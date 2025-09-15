import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SidebarSelectField from '@/views/create-variable-fertilization/SidebarSelectField.vue'
import StepStatusHeader from '@/views/create-variable-fertilization/components/StepStatusHeader.vue'

// useControlScreenWidthのモック
vi.mock('@/composables/useControlScreenWidth', () => ({
  useControlScreenWidth: vi.fn(() => ({
    isDesktop: true,
  })),
}))

// StepStatusHeaderのスタブ
const StepStatusHeaderStub = {
  name: 'StepStatusHeader',
  props: ['id', 'name', 'currentStepStatus'],
  emits: ['update:currentStepStatus'],
  template: '<div class="step-status-header-stub" @click="$emit(\'update:currentStepStatus\', \'current\')">{{ name }}</div>',
}

describe('SidebarSelectField', () => {
  describe('基本的なレンダリング', () => {
    it('正しくマウントされる', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'upcoming',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('StepStatusHeaderコンポーネントが表示される', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'current',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      const header = wrapper.findComponent(StepStatusHeader)
      expect(header.exists()).toBe(true)
      expect(header.props()).toMatchObject({
        id: '1',
        name: '圃場の選択',
        currentStepStatus: 'current',
      })
    })

    it('テキストメッセージが正しく表示される', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'current',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      expect(wrapper.text()).toContain('地図から圃場を選択')
    })
  })

  describe('ステップ状態による表示制御', () => {
    it('current状態のときコンテンツエリアが展開される', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'current',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      const contentArea = wrapper.find('[class*="px-5"]')
      expect(contentArea.classes()).toContain('max-h-96')
      expect(contentArea.classes()).toContain('overflow-auto')
    })

    it('current以外の状態のときコンテンツエリアが折りたたまれる', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'upcoming',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      const contentArea = wrapper.find('[class*="px-5"]')
      expect(contentArea.classes()).toContain('max-h-0')
      expect(contentArea.classes()).toContain('overflow-hidden')
    })

    it('completedステータスでも折りたたまれる', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'completed',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      const contentArea = wrapper.find('[class*="px-5"]')
      expect(contentArea.classes()).toContain('max-h-0')
      expect(contentArea.classes()).toContain('overflow-hidden')
    })
  })

  describe('レスポンシブ表示', () => {
    it('デスクトップでは常に表示される', async () => {
      const { useControlScreenWidth } = await import('@/composables/useControlScreenWidth')
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: true,
        isMobile: false,
        screenWidth: 1024,
      })

      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'upcoming',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      expect(wrapper.find('.grid-cols-1').exists()).toBe(true)
    })

    it('モバイルではcurrent状態のときのみ表示される', async () => {
      const { useControlScreenWidth } = await import('@/composables/useControlScreenWidth')
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: false,
        isMobile: true,
        screenWidth: 375,
      })

      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'upcoming',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      expect(wrapper.find('.grid-cols-1').exists()).toBe(false)
    })

    it('モバイルでcurrent状態のときは表示される', async () => {
      const { useControlScreenWidth } = await import('@/composables/useControlScreenWidth')
      vi.mocked(useControlScreenWidth).mockReturnValue({
        isDesktop: false,
        isMobile: true,
        screenWidth: 375,
      })

      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'current',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      expect(wrapper.find('.grid-cols-1').exists()).toBe(true)
    })
  })


  describe('スタイリング', () => {
    it('遷移アニメーションのクラスが適用される', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'current',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      const contentArea = wrapper.find('[class*="px-5"]')
      expect(contentArea.classes()).toContain('transition-all')
      expect(contentArea.classes()).toContain('duration-500')
    })

    it('テキストに正しいスタイルが適用される', () => {
      const wrapper = mount(SidebarSelectField, {
        props: {
          step1Status: 'current',
          'onUpdate:step1Status': vi.fn(),
        },
      })

      const textElement = wrapper.find('.text-rose-600')
      expect(textElement.exists()).toBe(true)
      expect(textElement.classes()).toContain('my-4')
    })
  })
})