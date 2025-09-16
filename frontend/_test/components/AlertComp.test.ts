import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AlertComp from '@/components/AlertComp.vue'
import { useStore } from '@/stores/store'

describe('AlertComp', () => {
  let store: ReturnType<typeof useStore>

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    store = useStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('アラート表示の基本動作', () => {
    it('初期状態ではアラートが非表示', () => {
      const wrapper = mount(AlertComp)
      
      const alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).toContain('display: none')
    })

    it('エラーメッセージが設定されるとアラートが表示される', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Error', 'テストエラーメッセージ')
      await wrapper.vm.$nextTick()
      
      const alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).not.toContain('display: none')
      
      const messageDiv = wrapper.find('.flex.items-center.justify-center.h-16 div')
      expect(messageDiv.text()).toBe('テストエラーメッセージ')
    })

    it('成功メッセージが設定されるとアラートが表示される', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Info', 'テスト成功メッセージ')
      await wrapper.vm.$nextTick()
      
      const alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).not.toContain('display: none')
      
      const messageDiv = wrapper.find('.flex.items-center.justify-center.h-16 div')
      expect(messageDiv.text()).toBe('テスト成功メッセージ')
    })
  })

  describe('スタイリングとタイプ別表示', () => {
    it('エラータイプの場合は赤色のスタイルが適用される', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Error', 'エラーメッセージ')
      await wrapper.vm.$nextTick()
      
      const alertBox = wrapper.find('.fixed')
      expect(alertBox.classes()).toContain('bg-red-100/80')
      expect(alertBox.classes()).toContain('border-red-600')
      
      const messageDiv = wrapper.find('.flex.items-center.justify-center.h-16 div')
      expect(messageDiv.classes()).toContain('text-red-600')
    })

    it('成功タイプの場合は緑色のスタイルが適用される', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Info', '成功メッセージ')
      await wrapper.vm.$nextTick()
      
      const alertBox = wrapper.find('.fixed')
      expect(alertBox.classes()).toContain('bg-green-100/80')
      expect(alertBox.classes()).toContain('border-green-600')
      
      const messageDiv = wrapper.find('.flex.items-center.justify-center.h-16 div')
      expect(messageDiv.classes()).toContain('text-green-600')
    })
  })

  describe('アラートの閉じる機能', () => {
    it('×ボタンをクリックするとアラートが閉じる', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Error', 'テストメッセージ')
      await wrapper.vm.$nextTick()
      
      // アラートが表示されていることを確認
      let alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).not.toContain('display: none')
      
      // ×ボタンをクリック
      const closeButton = wrapper.find('button')
      await closeButton.trigger('click')
      
      // アラートが非表示になることを確認
      alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).toContain('display: none')
      
      // ストアのメッセージもクリアされることを確認
      expect(store.alertMessage.message).toBe('')
      expect(store.alertMessage.alertType).toBe('')
    })

    it('3秒後に自動的にアラートが閉じる', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Info', '自動閉じテスト')
      await wrapper.vm.$nextTick()
      
      // アラートが表示されていることを確認
      let alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).not.toContain('display: none')
      
      // 3秒経過をシミュレート
      vi.advanceTimersByTime(3000)
      await wrapper.vm.$nextTick()
      
      // アラートが非表示になることを確認
      alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).toContain('display: none')
      
      // ストアのメッセージもクリアされることを確認
      expect(store.alertMessage.message).toBe('')
    })

    it('新しいメッセージが来ると既存のタイマーがクリアされる', async () => {
      const wrapper = mount(AlertComp)
      
      // 最初のメッセージ
      store.setMessage('Error', '最初のメッセージ')
      await wrapper.vm.$nextTick()
      
      // 1.5秒経過
      vi.advanceTimersByTime(1500)
      
      // 新しいメッセージ（タイマーがリセットされる）
      store.setMessage('Info', '新しいメッセージ')
      await wrapper.vm.$nextTick()
      
      // さらに1.5秒経過（合計3秒だが、タイマーはリセットされている）
      vi.advanceTimersByTime(1500)
      await wrapper.vm.$nextTick()
      
      // アラートはまだ表示されている
      const alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).not.toContain('display: none')
      expect(store.alertMessage.message).toBe('新しいメッセージ')
      
      // さらに1.5秒経過（新しいメッセージから3秒）
      vi.advanceTimersByTime(1500)
      await wrapper.vm.$nextTick()
      
      // 今度はアラートが閉じる
      expect(alertDiv.attributes('style')).toContain('display: none')
    })
  })

  describe('エッジケース', () => {
    it('空のメッセージが設定された場合はアラートが表示されない', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Error', '')
      await wrapper.vm.$nextTick()
      
      const alertDiv = wrapper.find('.relative')
      expect(alertDiv.attributes('style')).toContain('display: none')
    })

    it('連続してメッセージが設定された場合、最後のメッセージが表示される', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Error', 'メッセージ1')
      store.setMessage('Info', 'メッセージ2')
      store.setMessage('Error', 'メッセージ3')
      await wrapper.vm.$nextTick()
      
      const messageDiv = wrapper.find('.flex.items-center.justify-center.h-16 div')
      expect(messageDiv.text()).toBe('メッセージ3')
      
      // エラータイプのスタイルが適用されている
      expect(messageDiv.classes()).toContain('text-red-600')
    })
  })

  describe('アクセシビリティ', () => {
    it('閉じるボタンがbutton要素として正しく実装されている', async () => {
      const wrapper = mount(AlertComp)
      
      store.setMessage('Error', 'テストメッセージ')
      await wrapper.vm.$nextTick()
      
      const closeButton = wrapper.find('button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('type')).toBe('button')
      expect(closeButton.text()).toBe('×')
    })
  })
})