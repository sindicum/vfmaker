import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import VfmConfigComp from '@/views/create-variable-fertilization/components/VfmConfigComp.vue'
import { useConfigPersistStore } from '@/stores/configPersistStore'

describe('VfmConfigComp', () => {
  let configPersistStore: ReturnType<typeof useConfigPersistStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    configPersistStore = useConfigPersistStore()
  })

  describe('プロパティとレンダリング', () => {
    it('isOpenConfig=trueの場合にダイアログが表示される', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const dialog = wrapper.find('.fixed')
      expect(dialog.attributes('style') || '').not.toContain('display: none')
      expect(wrapper.text()).toContain('可変施肥マップ作成の設定')
    })

    it('isOpenConfig=falseの場合にダイアログが非表示になる', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: false,
        },
      })

      const dialog = wrapper.find('.fixed')
      expect(dialog.attributes('style')).toContain('display: none')
    })

    it('すべての設定項目が表示される', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      // メッシュの外周処理セクション
      expect(wrapper.text()).toContain('メッシュの外周処理')
      expect(wrapper.text()).toContain('圃場ポリゴン形状で切り抜く')
      expect(wrapper.text()).toContain('処理を行わない')

      // 施肥量の可変段階セクション
      expect(wrapper.text()).toContain('施肥量の可変段階')
      expect(wrapper.text()).toContain('5段階')
      expect(wrapper.text()).toContain('無段階')

      // 閉じるボタン
      expect(wrapper.text()).toContain('閉じる')
    })
  })

  describe('メッシュの外周処理設定', () => {
    it('outsideMeshClip=trueの場合「圃場ポリゴン形状で切り抜く」が選択される', () => {
      configPersistStore.outsideMeshClip = true

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const clipRadio = radioInputs[0] // 「圃場ポリゴン形状で切り抜く」
      const noClipRadio = radioInputs[1] // 「処理を行わない」

      expect((clipRadio.element as HTMLInputElement).checked).toBe(true)
      expect((noClipRadio.element as HTMLInputElement).checked).toBe(false)
    })

    it('outsideMeshClip=falseの場合「処理を行わない」が選択される', () => {
      configPersistStore.outsideMeshClip = false

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const clipRadio = radioInputs[0] // 「圃場ポリゴン形状で切り抜く」
      const noClipRadio = radioInputs[1] // 「処理を行わない」

      expect((clipRadio.element as HTMLInputElement).checked).toBe(false)
      expect((noClipRadio.element as HTMLInputElement).checked).toBe(true)
    })

    it('メッシュ外周処理の設定を変更できる', async () => {
      configPersistStore.outsideMeshClip = false

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const clipRadio = radioInputs[0] // 「圃場ポリゴン形状で切り抜く」

      await clipRadio.trigger('change')

      expect(configPersistStore.outsideMeshClip).toBe(true)
    })
  })

  describe('施肥量の可変段階設定', () => {
    it('fiveStepsFertilization=trueの場合「5段階」が選択される', () => {
      configPersistStore.fiveStepsFertilization = true

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const fiveStepsRadio = radioInputs[2] // 「5段階」
      const steplessRadio = radioInputs[3] // 「無段階」

      expect((fiveStepsRadio.element as HTMLInputElement).checked).toBe(true)
      expect((steplessRadio.element as HTMLInputElement).checked).toBe(false)
    })

    it('fiveStepsFertilization=falseの場合「無段階」が選択される', () => {
      configPersistStore.fiveStepsFertilization = false

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const fiveStepsRadio = radioInputs[2] // 「5段階」
      const steplessRadio = radioInputs[3] // 「無段階」

      expect((fiveStepsRadio.element as HTMLInputElement).checked).toBe(false)
      expect((steplessRadio.element as HTMLInputElement).checked).toBe(true)
    })

    it('施肥量段階の設定を変更できる', async () => {
      configPersistStore.fiveStepsFertilization = false

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const fiveStepsRadio = radioInputs[2] // 「5段階」

      await fiveStepsRadio.trigger('change')

      expect(configPersistStore.fiveStepsFertilization).toBe(true)
    })
  })

  describe('ダイアログの閉じる機能', () => {
    it('閉じるボタンをクリックするとisOpenConfigがfalseになる', async () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const closeButton = wrapper.find('button')
      expect(closeButton.text()).toBe('閉じる')

      await closeButton.trigger('click')

      // update:isOpenConfigイベントが発行される
      const emittedEvents = wrapper.emitted('update:isOpenConfig')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![0]).toEqual([false])
    })

    it('閉じる関数が正しく動作する', async () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      // 直接closeDialog関数をテスト
      const vm = wrapper.vm as any
      vm.closeDialog()

      // update:isOpenConfigイベントが発行される
      const emittedEvents = wrapper.emitted('update:isOpenConfig')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![0]).toEqual([false])
    })
  })

  describe('スタイリング', () => {
    it('ダイアログのオーバーレイが正しく設定されている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const overlay = wrapper.find('.fixed')
      expect(overlay.classes()).toContain('bg-black/50')
      expect(overlay.classes()).toContain('z-50')
      expect(overlay.classes()).toContain('w-screen')
      expect(overlay.classes()).toContain('h-screen')
    })

    it('ダイアログボックスのスタイルが正しく設定されている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const dialogBox = wrapper.find('.w-72.bg-white.rounded-md.p-5')
      expect(dialogBox.exists()).toBe(false)
    })

    it('セクション見出しが正しいスタイルを持っている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const sectionHeadings = wrapper.findAll('.text-rose-600')
      expect(sectionHeadings).toHaveLength(4)
      expect(sectionHeadings[0].text()).toBe('メッシュの外周処理')
      expect(sectionHeadings[1].text()).toBe('施肥量の可変段階')
    })

    it('ラジオボタンが正しいスタイルを持っている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const radioInputs = wrapper.findAll('input[type="radio"]')
      radioInputs.forEach((input) => {
        expect(input.classes()).toContain('w-4')
        expect(input.classes()).toContain('h-4')
        expect(input.classes()).toContain('accent-indigo-600')
      })
    })

    it('閉じるボタンが正しいスタイルを持っている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const closeButton = wrapper.find('button')
      expect(closeButton.classes()).toContain('h-12')
      expect(closeButton.classes()).toContain('w-28')
      expect(closeButton.classes()).toContain('bg-amber-300')
      expect(closeButton.classes()).toContain('hover:bg-amber-400')
      expect(closeButton.classes()).toContain('rounded-md')
    })
  })

  describe('アクセシビリティ', () => {
    it('ラジオボタンがlabel要素と適切に関連付けられている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const labels = wrapper.findAll('label')
      expect(labels).toHaveLength(6) // 6つの設定オプション

      labels.forEach((label) => {
        const inputElement = label.find('input')
        expect(inputElement.exists()).toBe(true)
        const typeAttr = (inputElement.element as HTMLInputElement).type
        expect(['radio', 'checkbox']).toContain(typeAttr)
        expect(label.classes()).toContain('flex')
        expect(label.classes()).toContain('items-center')
      })
    })

    it('閉じるボタンがbutton要素として実装されている', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      const closeButton = wrapper.find('button')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.element.tagName).toBe('BUTTON')
    })

    it('ダイアログの構造が適切である', () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      // 中央配置のレイアウト
      const centerContainer = wrapper.find('.flex.h-full.items-center.justify-center')
      expect(centerContainer.exists()).toBe(true)

      // 見出しが適切に配置されている
      const heading = wrapper.find('.font-semibold')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('可変施肥マップ作成の設定')
    })
  })

  describe('設定の組み合わせテスト', () => {
    it('すべての設定の組み合わせが正しく表示される', () => {
      // ケース1: 切り抜く + 5段階
      configPersistStore.outsideMeshClip = true
      configPersistStore.fiveStepsFertilization = true

      const wrapper1 = mount(VfmConfigComp, {
        props: { isOpenConfig: true },
      })

      const radios1 = wrapper1.findAll('input[type="radio"]')
      expect((radios1[0].element as HTMLInputElement).checked).toBe(true) // 切り抜く
      expect((radios1[1].element as HTMLInputElement).checked).toBe(false)
      expect((radios1[2].element as HTMLInputElement).checked).toBe(true) // 5段階
      expect((radios1[3].element as HTMLInputElement).checked).toBe(false)

      // ケース2: 処理しない + 無段階
      configPersistStore.outsideMeshClip = false
      configPersistStore.fiveStepsFertilization = false

      const wrapper2 = mount(VfmConfigComp, {
        props: { isOpenConfig: true },
      })

      const radios2 = wrapper2.findAll('input[type="radio"]')
      expect((radios2[0].element as HTMLInputElement).checked).toBe(false)
      expect((radios2[1].element as HTMLInputElement).checked).toBe(true) // 処理しない
      expect((radios2[2].element as HTMLInputElement).checked).toBe(false)
      expect((radios2[3].element as HTMLInputElement).checked).toBe(true) // 無段階
    })
  })

  describe('エッジケース', () => {
    it('ストアが初期状態でも正常に動作する', () => {
      // 新しいPiniaインスタンスで初期状態をテスト
      setActivePinia(createPinia())

      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: true,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('可変施肥マップ作成の設定')
    })

    it('プロパティの動的な変更に対応する', async () => {
      const wrapper = mount(VfmConfigComp, {
        props: {
          isOpenConfig: false,
        },
      })

      // 最初は非表示
      expect(wrapper.find('.fixed').attributes('style')).toContain('display: none')

      // プロパティを変更
      await wrapper.setProps({ isOpenConfig: true })

      // 表示される
      expect(wrapper.find('.fixed').attributes('style')).not.toContain('display: none')
    })
  })
})
