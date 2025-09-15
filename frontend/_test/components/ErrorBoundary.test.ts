import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'

// useErrorHandlerのモック
const mockHandleError = vi.fn()
vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}))

// window.location.reloadのモック
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
})

// エラーを発生させるテストコンポーネント
const ErrorComponent = defineComponent({
  setup() {
    const shouldThrowError = ref(false)
    
    const throwError = () => {
      shouldThrowError.value = true
      throw new Error('Test component error')
    }

    return {
      shouldThrowError,
      throwError,
    }
  },
  template: `
    <div>
      <button @click="throwError" data-testid="error-trigger">Trigger Error</button>
      <div v-if="shouldThrowError">This should not render</div>
    </div>
  `,
})

// 正常なテストコンポーネント
const NormalComponent = defineComponent({
  template: '<div data-testid="normal-content">正常なコンテンツ</div>',
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // console.errorをモック化してテスト出力をクリーンに保つ
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('正常な状態', () => {
    it('エラーがない場合は子コンポーネントが正常に表示される', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: '<div data-testid="child">正常な子コンポーネント</div>',
        },
      })

      expect(wrapper.find('[data-testid="child"]').exists()).toBe(true)
      expect(wrapper.find('.error-boundary').exists()).toBe(false)
      expect(wrapper.text()).toContain('正常な子コンポーネント')
    })

    it('複数の子コンポーネントが正常に表示される', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: `
            <div data-testid="child-1">子コンポーネント1</div>
            <div data-testid="child-2">子コンポーネント2</div>
          `,
        },
      })

      expect(wrapper.find('[data-testid="child-1"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="child-2"]').exists()).toBe(true)
      expect(wrapper.find('.error-boundary').exists()).toBe(false)
    })
  })

  describe('エラー処理', () => {
    it('子コンポーネントでエラーが発生するとエラー画面が表示される', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      // 最初は正常なコンテンツが表示される
      expect(wrapper.find('[data-testid="error-trigger"]').exists()).toBe(true)
      expect(wrapper.find('.error-boundary').exists()).toBe(false)

      // エラーを発生させる
      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      // エラー画面が表示される
      expect(wrapper.find('.error-boundary').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error-trigger"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('アプリケーションエラーが発生しました')
    })

    it('エラーが発生するとhandleErrorが適切な情報で呼ばれる', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      // エラーを発生させる
      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      expect(mockHandleError).toHaveBeenCalledTimes(1)
      const errorCall = mockHandleError.mock.calls[0][0]

      expect(errorCall).toMatchObject({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: 'Test component error',
        userMessage: 'アプリケーションエラーが発生しました',
        context: expect.objectContaining({
          componentInfo: expect.any(String),
          stack: expect.any(String),
        }),
        originalError: expect.any(Error),
      })

      // IDとtimestampが生成されていることを確認
      expect(errorCall.id).toMatch(/^error_boundary_\d+_[a-z0-9]+$/)
      expect(errorCall.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('エラー画面のUI', () => {
    it('エラー画面に必要な要素が表示される', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      // エラーを発生させる
      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      // エラーアイコン（SVG）が表示される
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('svg').classes()).toContain('text-red-500')

      // エラータイトルが表示される
      expect(wrapper.find('h3').text()).toBe('アプリケーションエラーが発生しました')

      // エラーメッセージが表示される
      expect(wrapper.text()).toContain('申し訳ございません。予期しないエラーが発生しました。')

      // 再試行ボタンが表示される
      const retryButton = wrapper.find('button')
      expect(retryButton.exists()).toBe(true)
      expect(retryButton.text()).toBe('再試行')
    })

    it('エラー画面のスタイリングが正しい', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      // エラーを発生させる
      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      // コンテナのスタイル
      const container = wrapper.find('.flex.flex-col.items-center.justify-center')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('min-h-[200px]')
      expect(container.classes()).toContain('p-8')
      expect(container.classes()).toContain('text-center')

      // タイトルのスタイル
      const title = wrapper.find('h3')
      expect(title.classes()).toContain('text-lg')
      expect(title.classes()).toContain('font-medium')
      expect(title.classes()).toContain('text-gray-900')

      // ボタンのスタイル
      const button = wrapper.find('button')
      expect(button.classes()).toContain('px-4')
      expect(button.classes()).toContain('py-2')
      expect(button.classes()).toContain('bg-blue-600')
      expect(button.classes()).toContain('text-white')
      expect(button.classes()).toContain('rounded-md')
      expect(button.classes()).toContain('hover:bg-blue-700')
    })
  })

  describe('再試行機能', () => {
    it('再試行ボタンをクリックするとページがリロードされる', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      // エラーを発生させる
      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      // 再試行ボタンをクリック
      const retryButton = wrapper.find('button')
      await retryButton.trigger('click')

      expect(mockReload).toHaveBeenCalledTimes(1)
    })
  })

  describe('エラーID生成', () => {
    it('各エラーに一意のIDが生成される', async () => {
      const wrapper1 = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      const wrapper2 = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      // 両方でエラーを発生させる
      try {
        await wrapper1.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      try {
        await wrapper2.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper1.vm.$nextTick()
      await wrapper2.vm.$nextTick()

      expect(mockHandleError).toHaveBeenCalledTimes(2)
      const error1Id = mockHandleError.mock.calls[0][0].id
      const error2Id = mockHandleError.mock.calls[1][0].id

      expect(error1Id).not.toBe(error2Id)
      expect(error1Id).toMatch(/^error_boundary_\d+_[a-z0-9]+$/)
      expect(error2Id).toMatch(/^error_boundary_\d+_[a-z0-9]+$/)
    })
  })

  describe('エラー情報の収集', () => {
    it('コンポーネント情報が正しく収集される', async () => {
      const TestComponentWithName = defineComponent({
        name: 'TestComponentWithName',
        setup() {
          const throwError = () => {
            throw new Error('Named component error')
          }
          return { throwError }
        },
        template: '<button @click="throwError" data-testid="named-error-trigger">Error</button>',
      })

      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: TestComponentWithName,
        },
      })

      try {
        await wrapper.find('[data-testid="named-error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      const errorCall = mockHandleError.mock.calls[0][0]
      expect(errorCall.context.componentName).toBe('TestComponentWithName')
      expect(errorCall.message).toBe('Named component error')
    })

    it('スタック情報が含まれる', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: ErrorComponent,
        },
      })

      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      const errorCall = mockHandleError.mock.calls[0][0]
      expect(errorCall.context.stack).toBeDefined()
      expect(typeof errorCall.context.stack).toBe('string')
    })
  })

  describe('エラー境界の分離', () => {
    it('エラーの伝播が停止される', async () => {
      let parentErrorCaught = false
      
      const ParentComponent = defineComponent({
        setup() {
          const onErrorCaptured = () => {
            parentErrorCaught = true
            return false
          }
          return { onErrorCaptured }
        },
        template: `
          <div @vue:error-captured="onErrorCaptured">
            <ErrorBoundary>
              <ErrorComponent />
            </ErrorBoundary>
          </div>
        `,
        components: {
          ErrorBoundary,
          ErrorComponent,
        },
      })

      const wrapper = mount(ParentComponent)

      try {
        await wrapper.find('[data-testid="error-trigger"]').trigger('click')
      } catch (e) {
        // エラーは期待される
      }

      await wrapper.vm.$nextTick()

      // ErrorBoundaryがエラーをキャッチするため、親にはエラーが伝播しない
      expect(parentErrorCaught).toBe(false)
      expect(wrapper.find('.error-boundary').exists()).toBe(true)
    })
  })
})