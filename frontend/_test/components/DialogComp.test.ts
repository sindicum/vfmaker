import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DialogComp from '@/components/DialogComp.vue'

describe('DialogComp', () => {
  const defaultProps = {
    message: 'テストメッセージ',
    isOpen: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('プロパティとレンダリング', () => {
    it('プロパティが正しくレンダリングされる', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const messageDiv = wrapper.find('.text-center')
      expect(messageDiv.text()).toBe('テストメッセージ')
    })

    it('isOpenがtrueの場合ダイアログが表示される', () => {
      const wrapper = mount(DialogComp, {
        props: { ...defaultProps, isOpen: true },
      })

      const dialogDiv = wrapper.find('.fixed')
      expect(dialogDiv.attributes('style') || '').not.toContain('display: none')
    })

    it('isOpenがfalseの場合ダイアログが非表示になる', () => {
      const wrapper = mount(DialogComp, {
        props: { ...defaultProps, isOpen: false },
      })

      const dialogDiv = wrapper.find('.fixed')
      expect(dialogDiv.attributes('style')).toContain('display: none')
    })

    it('長いメッセージも正しく表示される', () => {
      const longMessage = 'これは非常に長いテストメッセージです。ダイアログの表示を確認するために使用されます。'
      const wrapper = mount(DialogComp, {
        props: { ...defaultProps, message: longMessage },
      })

      const messageDiv = wrapper.find('.text-center')
      expect(messageDiv.text()).toBe(longMessage)
    })
  })

  describe('ボタンの動作', () => {
    it('「はい」ボタンをクリックするとselectedイベントでtrueが発行される', async () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const yesButton = wrapper.findAll('button')[0]
      expect(yesButton.text()).toBe('はい')

      await yesButton.trigger('click')

      const emittedEvents = wrapper.emitted('selected')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![0]).toEqual([true])
    })

    it('「いいえ」ボタンをクリックするとselectedイベントでfalseが発行される', async () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const noButton = wrapper.findAll('button')[1]
      expect(noButton.text()).toBe('いいえ')

      await noButton.trigger('click')

      const emittedEvents = wrapper.emitted('selected')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![0]).toEqual([false])
    })

    it('複数回ボタンをクリックすると複数のイベントが発行される', async () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const yesButton = wrapper.findAll('button')[0]
      const noButton = wrapper.findAll('button')[1]

      await yesButton.trigger('click')
      await noButton.trigger('click')
      await yesButton.trigger('click')

      const emittedEvents = wrapper.emitted('selected')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents!.length).toBe(3)
      expect(emittedEvents![0]).toEqual([true])
      expect(emittedEvents![1]).toEqual([false])
      expect(emittedEvents![2]).toEqual([true])
    })
  })

  describe('スタイリング', () => {
    it('オーバーレイの背景が正しく設定されている', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const overlay = wrapper.find('.fixed')
      expect(overlay.classes()).toContain('bg-black/30')
      expect(overlay.classes()).toContain('z-50')
      expect(overlay.classes()).toContain('w-screen')
      expect(overlay.classes()).toContain('h-screen')
    })

    it('ダイアログボックスのスタイルが正しく設定されている', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const dialogBox = wrapper.find('.bg-slate-100')
      expect(dialogBox.classes()).toContain('w-80')
      expect(dialogBox.classes()).toContain('h-44')
      expect(dialogBox.classes()).toContain('rounded-md')
    })

    it('「はい」ボタンのスタイルが正しく設定されている', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const yesButton = wrapper.findAll('button')[0]
      expect(yesButton.classes()).toContain('bg-amber-300')
      expect(yesButton.classes()).toContain('hover:bg-amber-400')
      expect(yesButton.classes()).toContain('h-12')
      expect(yesButton.classes()).toContain('w-28')
      expect(yesButton.classes()).toContain('rounded-md')
    })

    it('「いいえ」ボタンのスタイルが正しく設定されている', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const noButton = wrapper.findAll('button')[1]
      expect(noButton.classes()).toContain('bg-white')
      expect(noButton.classes()).toContain('hover:bg-slate-50')
      expect(noButton.classes()).toContain('border')
      expect(noButton.classes()).toContain('border-slate-800')
      expect(noButton.classes()).toContain('h-12')
      expect(noButton.classes()).toContain('w-28')
      expect(noButton.classes()).toContain('rounded-md')
    })
  })

  describe('アクセシビリティ', () => {
    it('両方のボタンがbutton要素として実装されている', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      
      buttons.forEach(button => {
        expect(button.element.tagName).toBe('BUTTON')
      })
    })

    it('ボタンテキストが適切に設定されている', () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      const buttons = wrapper.findAll('button')
      expect(buttons[0].text()).toBe('はい')
      expect(buttons[1].text()).toBe('いいえ')
    })
  })

  describe('エッジケース', () => {
    it('空のメッセージでも正常に動作する', () => {
      const wrapper = mount(DialogComp, {
        props: { ...defaultProps, message: '' },
      })

      const messageDiv = wrapper.find('.text-center')
      expect(messageDiv.text()).toBe('')
      
      // ボタンは正常に機能する
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
    })

    it('HTMLタグを含むメッセージが適切にエスケープされる', () => {
      const htmlMessage = '<script>alert("test")</script>テストメッセージ'
      const wrapper = mount(DialogComp, {
        props: { ...defaultProps, message: htmlMessage },
      })

      const messageDiv = wrapper.find('.text-center')
      // HTMLタグがそのままテキストとして表示される（エスケープされる）
      expect(messageDiv.text()).toBe(htmlMessage)
      // HTMLとして解釈されない
      expect(messageDiv.find('script').exists()).toBe(false)
    })

    it('プロパティが動的に変更されると表示が更新される', async () => {
      const wrapper = mount(DialogComp, {
        props: defaultProps,
      })

      // 初期メッセージの確認
      expect(wrapper.find('.text-center').text()).toBe('テストメッセージ')

      // プロパティを更新
      await wrapper.setProps({ message: '更新されたメッセージ', isOpen: true })

      // メッセージが更新されることを確認
      expect(wrapper.find('.text-center').text()).toBe('更新されたメッセージ')
    })

    it('isOpenが複数回切り替わっても正常に動作する', async () => {
      const wrapper = mount(DialogComp, {
        props: { ...defaultProps, isOpen: false },
      })

      // 最初は非表示
      expect(wrapper.find('.fixed').attributes('style')).toContain('display: none')

      // 表示に切り替え
      await wrapper.setProps({ isOpen: true })
      expect(wrapper.find('.fixed').attributes('style')).not.toContain('display: none')

      // 再び非表示に切り替え
      await wrapper.setProps({ isOpen: false })
      expect(wrapper.find('.fixed').attributes('style')).toContain('display: none')
    })
  })
})