import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StepStatusHeader from '@/views/create-variable-fertilization/components/StepStatusHeader.vue'

// Heroiconsのモック
vi.mock('@heroicons/vue/20/solid', () => ({
  CheckIcon: {
    name: 'CheckIcon',
    template: '<svg data-testid="check-icon"></svg>',
  },
}))

describe('StepStatusHeader', () => {
  const defaultProps = {
    'id': 1,
    'name': 'テストステップ',
    'currentStepStatus': 'current',
  }

  describe('プロパティとレンダリング', () => {
    it('基本的なプロパティが正しくレンダリングされる', () => {
      const wrapper = mount(StepStatusHeader, {
        props: defaultProps,
      })

      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('テストステップ')
    })

    it('異なるidと名前でレンダリングされる', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          'id': 3,
          'name': 'エクスポート',
          'currentStepStatus': 'pending',
        },
      })

      expect(wrapper.text()).toContain('3')
      expect(wrapper.text()).toContain('エクスポート')
    })
  })

  describe('ステップ状態の表示', () => {
    it('currentStepStatus="complete"の場合にCheckIconが表示される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'complete',
        },
      })

      // チェックアイコンのスパンが存在する
      const checkIconSpan = wrapper.find('.bg-indigo-600')
      expect(checkIconSpan.exists()).toBe(true)

      // CheckIconが存在する
      const checkIcon = wrapper.find('[data-slot="icon"]')
      expect(checkIcon.exists()).toBe(true)

      // idは表示されない（チェックアイコンが代わりに表示される）
      expect(wrapper.text()).not.toContain('1')
    })

    it('currentStepStatus="current"の場合にidが表示される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'current',
        },
      })

      // idが表示される
      expect(wrapper.text()).toContain('1')

      // ボーダー付きのスパンが存在する
      const idSpan = wrapper.find('.border-indigo-600')
      expect(idSpan.exists()).toBe(true)

      // CheckIconは表示されない
      const checkIcon = wrapper.find('[data-slot="icon"]')
      expect(checkIcon.exists()).toBe(false)
    })

    it('currentStepStatus="pending"の場合にidが表示される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'pending',
        },
      })

      // idが表示される
      expect(wrapper.text()).toContain('1')

      // ボーダー付きのスパンが存在する
      const idSpan = wrapper.find('.border-indigo-600')
      expect(idSpan.exists()).toBe(true)
    })
  })

  describe('スタイリング', () => {
    it('completeステップでは適切なスタイルが適用される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'complete',
        },
      })

      const iconContainer = wrapper.find('.bg-indigo-600')
      expect(iconContainer.exists()).toBe(true)
      expect(iconContainer.classes()).toContain('rounded-full')
      expect(iconContainer.classes()).toContain('group-hover:bg-indigo-800')
    })

    it('currentステップでは名前に適切なスタイルが適用される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'current',
        },
      })

      const nameSpan = wrapper.find('.font-medium')
      expect(nameSpan.exists()).toBe(true)
      expect(nameSpan.text()).toBe('テストステップ')
    })

    it('非currentステップでは名前がグレー表示される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'pending',
        },
      })

      const nameSpan = wrapper.find('.text-gray-400')
      expect(nameSpan.exists()).toBe(true)
      expect(nameSpan.text()).toBe('テストステップ')

      // font-mediumクラスは適用されない
      expect(nameSpan.classes()).not.toContain('font-medium')
    })

    it('レスポンシブクラスが正しく適用される', () => {
      const wrapper = mount(StepStatusHeader, {
        props: defaultProps,
      })

      // レスポンシブサイズクラス
      const iconContainer = wrapper.find('.lg\\:h-8.lg\\:w-8.h-6.w-6')
      expect(iconContainer.exists()).toBe(true)

      // レスポンシブマージンクラス
      const nameSpan = wrapper.find('.ml-1.lg\\:ml-4')
      expect(nameSpan.exists()).toBe(true)

      // レスポンシブパディングクラス
      const container = wrapper.find('.p-1.lg\\:p-2')
      expect(container.exists()).toBe(true)
    })
  })

  describe('アイコンと番号の表示ロジック', () => {
    it('completeの場合はチェックアイコンのみ表示され、番号は非表示', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'complete',
        },
      })

      // チェックアイコンコンテナが存在
      const checkContainer = wrapper.find('.bg-indigo-600')
      expect(checkContainer.exists()).toBe(true)

      // 番号コンテナは存在しない
      const numberContainer = wrapper.find('.border-indigo-600')
      expect(numberContainer.exists()).toBe(false)
    })

    it('complete以外の場合は番号のみ表示され、チェックアイコンは非表示', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          ...defaultProps,
          'currentStepStatus': 'current',
        },
      })

      // 番号コンテナが存在
      const numberContainer = wrapper.find('.border-indigo-600')
      expect(numberContainer.exists()).toBe(true)

      // チェックアイコンコンテナは存在しない
      const checkContainer = wrapper.find('.bg-indigo-600')
      expect(checkContainer.exists()).toBe(false)
    })
  })

  describe('v-modelの動作', () => {
    it('defineModelでプロパティが正しく受け取られる', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          'id': 2,
          'name': 'グリッド設定',
          'currentStepStatus': 'complete',
        },
      })

      // プロパティが正しく反映される
      expect(wrapper.text()).toContain('グリッド設定')
      
      // completeステータスでチェックアイコンが表示される
      const checkContainer = wrapper.find('.bg-indigo-600')
      expect(checkContainer.exists()).toBe(true)
    })
  })

  describe('エッジケース', () => {
    it('空の名前でも正常に動作する', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          'id': 1,
          'name': '',
          'currentStepStatus': 'current',
        },
      })

      // idは表示される
      expect(wrapper.text()).toContain('1')
      
      // エラーは発生しない
      expect(wrapper.exists()).toBe(true)
    })

    it('0のidでも正常に動作する', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          'id': 0,
          'name': 'ゼロステップ',
          'currentStepStatus': 'current',
        },
      })

      // 0が表示される
      expect(wrapper.text()).toContain('0')
      expect(wrapper.text()).toContain('ゼロステップ')
    })

    it('未定義のステータスでもエラーが発生しない', () => {
      const wrapper = mount(StepStatusHeader, {
        props: {
          'id': 1,
          'name': 'テストステップ',
          'currentStepStatus': 'unknown',
        },
      })

      // 基本的な表示は動作する
      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('テストステップ')
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('アクセシビリティ', () => {
    it('適切なHTML構造を持っている', () => {
      const wrapper = mount(StepStatusHeader, {
        props: defaultProps,
      })

      // flexレイアウトが適用されている
      const flexContainer = wrapper.find('.flex.items-center')
      expect(flexContainer.exists()).toBe(true)

      // span要素が適切に構造化されている
      const spans = wrapper.findAll('span')
      expect(spans.length).toBeGreaterThan(0)
    })

    it('ステータスが視覚的に区別できる', () => {
      const completeWrapper = mount(StepStatusHeader, {
        props: { ...defaultProps, 'currentStepStatus': 'complete' },
      })

      const currentWrapper = mount(StepStatusHeader, {
        props: { ...defaultProps, 'currentStepStatus': 'current' },
      })

      // completeは背景色があり、currentはボーダーがある
      expect(completeWrapper.find('.bg-indigo-600').exists()).toBe(true)
      expect(currentWrapper.find('.border-indigo-600').exists()).toBe(true)
    })
  })
})