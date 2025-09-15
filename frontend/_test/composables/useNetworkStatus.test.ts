import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { flushPromises, mount } from '@vue/test-utils'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'
import { defineComponent, h } from 'vue'

// useErrorHandlerのモック
const mockHandleError = vi.fn()
vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}))

// navigatorのモック
const mockNavigator = {
  onLine: true,
  userAgent: 'test-user-agent',
}
Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  configurable: true,
})

describe('useNetworkStatus', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigator.onLine = true
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  describe('初期化', () => {
    it('navigatorのonLine状態で初期化される', () => {
      mockNavigator.onLine = true
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))
      expect(wrapper.vm.isOnline).toBe(true)
      wrapper.unmount()

      mockNavigator.onLine = false
      const wrapper2 = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))
      expect(wrapper2.vm.isOnline).toBe(false)
      wrapper2.unmount()
    })

    it('マウント時にイベントリスナーが登録される', () => {
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
      wrapper.unmount()
    })
  })

  describe('ネットワーク状態の変更', () => {
    it('オンラインイベントで状態が更新される', async () => {
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))
      wrapper.vm.isOnline = false

      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)
      await flushPromises()

      expect(wrapper.vm.isOnline).toBe(true)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.LOW,
          message: 'ネットワーク状態変更: online',
          userMessage: 'インターネット接続が復旧しました。',
          context: { networkStatus: 'online', userAgent: 'test-user-agent' },
        }),
      )
      wrapper.unmount()
    })

    it('オフラインイベントで状態が更新される', async () => {
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))
      wrapper.vm.isOnline = true

      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
      await flushPromises()

      expect(wrapper.vm.isOnline).toBe(false)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          message: 'ネットワーク状態変更: offline',
          userMessage: 'インターネット接続が切断されました。地図データの読み込みができません。',
          context: { networkStatus: 'offline', userAgent: 'test-user-agent' },
        }),
      )
      wrapper.unmount()
    })

    it('エラーオブジェクトにユニークなIDが含まれる', async () => {
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))

      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
      await flushPromises()

      const firstCall = mockHandleError.mock.calls[0][0]
      expect(firstCall.id).toMatch(/^network_offline_\d+_[a-z0-9]+$/)

      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)
      await flushPromises()

      const secondCall = mockHandleError.mock.calls[1][0]
      expect(secondCall.id).toMatch(/^network_online_\d+_[a-z0-9]+$/)
      expect(firstCall.id).not.toBe(secondCall.id)
      wrapper.unmount()
    })
  })

  describe('クリーンアップ', () => {
    it('アンマウント時にイベントリスナーが削除される', () => {
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('削除されるイベントリスナーが登録時と同じ関数である', () => {
      const wrapper = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))

      const onlineHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'online',
      )?.[1]
      const offlineHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'offline',
      )?.[1]

      wrapper.unmount()

      const removedOnlineHandler = removeEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'online',
      )?.[1]
      const removedOfflineHandler = removeEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'offline',
      )?.[1]

      expect(onlineHandler).toBe(removedOnlineHandler)
      expect(offlineHandler).toBe(removedOfflineHandler)
    })
  })

  describe('複数インスタンス', () => {
    it('複数のインスタンスが独立して動作する', async () => {
      const wrapper1 = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))

      const wrapper2 = mount(defineComponent({
        setup() {
          const { isOnline } = useNetworkStatus()
          return { isOnline }
        },
        render() {
          return h('div')
        },
      }))

      expect(wrapper1.vm.isOnline).toBe(true)
      expect(wrapper2.vm.isOnline).toBe(true)

      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
      await flushPromises()

      expect(wrapper1.vm.isOnline).toBe(false)
      expect(wrapper2.vm.isOnline).toBe(false)

      // エラーハンドラーは両方のインスタンスから呼ばれる
      expect(mockHandleError).toHaveBeenCalledTimes(2)

      wrapper1.unmount()
      wrapper2.unmount()
    })
  })
})