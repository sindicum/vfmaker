import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InputNumberDialog from '@/views/create-variable-fertilization/components/InputNumberDialog.vue'
import type { dialogType } from '@/types/maplibre'

describe('InputNumberDialog', () => {
  const defaultProps = {
    dialogName: 'gridEW' as dialogType,
    gridRotationAngle: 0,
    gridEW: 20,
    gridNS: 20,
    buffer: 0,
    baseFertilizationAmount: 100,
    variableFertilizationRangeRate: 20,
  }

  describe('プロパティとレンダリング', () => {
    it('dialogNameが空でない場合にダイアログが表示される', () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      const dialog = wrapper.find('.fixed')
      expect(dialog.attributes('style') || '').not.toContain('display: none')
      expect(wrapper.text()).toContain('数値を入力してください')
    })

    it('dialogNameが空の場合にダイアログが非表示になる', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: '',
        },
      })

      const dialog = wrapper.find('.fixed')
      expect(dialog.attributes('style')).toContain('display: none')
    })

    it('基本的なUI要素が表示される', () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      // 説明テキスト
      expect(wrapper.text()).toContain('数値を入力してください')

      // 範囲表示（gridEWの場合: 10-50）
      expect(wrapper.text()).toContain('最小値10')
      expect(wrapper.text()).toContain('最大値50')

      // 数値表示エリア
      expect(wrapper.find('.text-3xl.font-semibold').exists()).toBe(true)

      // ボタン類
      expect(wrapper.text()).toContain('キャンセル')
      expect(wrapper.text()).toContain('入力')
    })
  })

  describe('dialogType別の最小・最大値', () => {
    it('rotationAngleの場合は0-90の範囲', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'rotationAngle',
        },
      })

      expect(wrapper.text()).toContain('最小値0')
      expect(wrapper.text()).toContain('最大値90')
    })

    it('gridEWの場合は10-50の範囲', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'gridEW',
        },
      })

      expect(wrapper.text()).toContain('最小値10')
      expect(wrapper.text()).toContain('最大値50')
    })

    it('bufferの場合は-20から20の範囲', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'buffer',
        },
      })

      expect(wrapper.text()).toContain('最小値-20')
      expect(wrapper.text()).toContain('最大値20')
    })

    it('baseFertilizationAmountの場合は1-999の範囲', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'baseFertilizationAmount',
        },
      })

      expect(wrapper.text()).toContain('最小値1')
      expect(wrapper.text()).toContain('最大値999')
    })
  })

  describe('数値入力機能', () => {
    it('数字ボタンをクリックして数値を入力できる', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      // 最初は0が表示される
      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('0')

      // 数字ボタン「1」をクリック
      const button1 = wrapper.findAll('button').find((btn) => btn.text() === '1')
      await button1!.trigger('click')

      // 「01」が表示される（文字列として追加される）
      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('1')

      // 数字ボタン「2」をクリック
      const button2 = wrapper.findAll('button').find((btn) => btn.text() === '2')
      await button2!.trigger('click')

      // 「012」が表示される
      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('12')
    })

    it('複数の数字を順次入力できる', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      // 1, 2, 3を順次クリック
      const buttons = wrapper.findAll('button')
      const button1 = buttons.find((btn) => btn.text() === '1')
      const button2 = buttons.find((btn) => btn.text() === '2')
      const button3 = buttons.find((btn) => btn.text() === '3')

      await button1!.trigger('click')
      await button2!.trigger('click')
      await button3!.trigger('click')

      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('123')
    })

    it('Cボタンで入力をクリアできる', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      // 数値を入力
      const button5 = wrapper.findAll('button').find((btn) => btn.text() === '5')
      await button5!.trigger('click')
      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('5')

      // Cボタンをクリック
      const clearButton = wrapper.findAll('button').find((btn) => btn.text() === 'C')
      await clearButton!.trigger('click')

      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('0')
    })
  })

  describe('負の数入力（bufferの場合）', () => {
    it('bufferダイアログではマイナスボタンが表示される', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'buffer',
        },
      })

      const minusButton = wrapper.findAll('button').find((btn) => btn.text() === '-')
      expect(minusButton).toBeDefined()
    })

    it('正の値のみのダイアログではマイナスボタンが表示されない', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'gridEW',
        },
      })

      const minusButton = wrapper.findAll('button').find((btn) => btn.text() === '-')
      expect(minusButton).toBeUndefined()
    })

    it('マイナスボタンをクリックすると負の数入力モードになる', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'buffer',
        },
      })

      const minusButton = wrapper.findAll('button').find((btn) => btn.text() === '-')
      await minusButton!.trigger('click')

      // 表示は0のまま（マイナス記号だけでは数値として0）
      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('0')

      // 数字を入力すると負の数になる
      const button5 = wrapper.findAll('button').find((btn) => btn.text() === '5')
      await button5!.trigger('click')

      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('-5')
    })

    it('マイナスボタンを押した後は無効化される', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'buffer',
        },
      })

      const minusButton = wrapper.findAll('button').find((btn) => btn.text() === '-')
      await minusButton!.trigger('click')

      // マイナスボタンが無効化される
      expect((minusButton!.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('入力確定機能', () => {
    it('範囲内の値を入力して確定できる', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'gridEW',
        },
      })

      // 25を入力（gridEWの範囲10-50内）
      const button2 = wrapper.findAll('button').find((btn) => btn.text() === '2')
      const button5 = wrapper.findAll('button').find((btn) => btn.text() === '5')
      await button2!.trigger('click')
      await button5!.trigger('click')

      // 入力ボタンをクリック
      const submitButton = wrapper.findAll('button').find((btn) => btn.text() === '入力')
      await submitButton!.trigger('click')

      // update:gridEWイベントが発行される
      const emittedEvents = wrapper.emitted('update:gridEW')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![0]).toEqual([25])

      // ダイアログが閉じる
      const dialogNameEvents = wrapper.emitted('update:dialogName')
      expect(dialogNameEvents).toBeTruthy()
      expect(dialogNameEvents![0]).toEqual([''])
    })

    it('最大値を超える値は最大値に制限される', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'gridEW', // 最大値50
        },
      })

      // 999を入力（最大値50を超える）
      const button9 = wrapper.findAll('button').find((btn) => btn.text() === '9')
      await button9!.trigger('click')
      await button9!.trigger('click')
      await button9!.trigger('click')

      const submitButton = wrapper.findAll('button').find((btn) => btn.text() === '入力')
      await submitButton!.trigger('click')

      // 最大値50で制限される
      const emittedEvents = wrapper.emitted('update:gridEW')
      expect(emittedEvents![0]).toEqual([50])
    })

    it('最小値を下回る値は最小値に制限される', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'gridEW', // 最小値10
        },
      })

      // 5を入力（最小値10を下回る）
      const button5 = wrapper.findAll('button').find((btn) => btn.text() === '5')
      await button5!.trigger('click')

      const submitButton = wrapper.findAll('button').find((btn) => btn.text() === '入力')
      await submitButton!.trigger('click')

      // 最小値10で制限される
      const emittedEvents = wrapper.emitted('update:gridEW')
      expect(emittedEvents![0]).toEqual([10])
    })
  })

  describe('キャンセル機能', () => {
    it('キャンセルボタンでダイアログを閉じる', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      // 数値を入力
      const button7 = wrapper.findAll('button').find((btn) => btn.text() === '7')
      await button7!.trigger('click')

      // キャンセルボタンをクリック
      const cancelButton = wrapper.findAll('button').find((btn) => btn.text() === 'キャンセル')
      await cancelButton!.trigger('click')

      // ダイアログが閉じる（値は保存されない）
      const dialogNameEvents = wrapper.emitted('update:dialogName')
      expect(dialogNameEvents![0]).toEqual([''])

      // gridEWの値は変更されない
      const gridEWEvents = wrapper.emitted('update:gridEW')
      expect(gridEWEvents).toBeFalsy()
    })
  })

  describe('dialogType別の動作', () => {
    const testCases: {
      dialogName: dialogType
      modelProp: string
      value: number
    }[] = [
      { dialogName: 'rotationAngle', modelProp: 'update:gridRotationAngle', value: 45 },
      { dialogName: 'gridNS', modelProp: 'update:gridNS', value: 25 },
      { dialogName: 'buffer', modelProp: 'update:buffer', value: 5 },
      {
        dialogName: 'baseFertilizationAmount',
        modelProp: 'update:baseFertilizationAmount',
        value: 150,
      },
      {
        dialogName: 'variableFertilizationRangeRate',
        modelProp: 'update:variableFertilizationRangeRate',
        value: 30,
      },
    ]

    testCases.forEach(({ dialogName, modelProp, value }) => {
      it(`${dialogName}で正しいプロパティが更新される`, async () => {
        const wrapper = mount(InputNumberDialog, {
          props: {
            ...defaultProps,
            dialogName: dialogName,
          },
        })

        // 値を入力
        const valueStr = value.toString()
        for (const digit of valueStr) {
          const button = wrapper.findAll('button').find((btn) => btn.text() === digit)
          await button!.trigger('click')
        }

        // 入力確定
        const submitButton = wrapper.findAll('button').find((btn) => btn.text() === '入力')
        await submitButton!.trigger('click')

        // 対応するモデルプロパティが更新される
        const emittedEvents = wrapper.emitted(modelProp)
        expect(emittedEvents).toBeTruthy()
        expect(emittedEvents![0]).toEqual([value])
      })
    })
  })

  describe('エッジケース', () => {
    it('空文字のdialogNameでも初期表示が崩れない', () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: '',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('入力値が文字列の"-"のみの場合はNaNとして出力される', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: 'buffer',
        },
      })

      // マイナスボタンのみクリック
      const minusButton = wrapper.findAll('button').find((btn) => btn.text() === '-')
      await minusButton!.trigger('click')

      // 表示は0
      expect(wrapper.find('.text-3xl.font-semibold').text()).toBe('0')

      // 入力確定
      const submitButton = wrapper.findAll('button').find((btn) => btn.text() === '入力')
      await submitButton!.trigger('click')

      // NaNがそのまま出力される（コンポーネントの実際の動作）
      const emittedEvents = wrapper.emitted('update:buffer')
      expect(Number.isNaN(emittedEvents![0][0])).toBe(true)
    })

    it('undefinedのdialogNameでinputNumを呼んでもエラーにならない', async () => {
      const wrapper = mount(InputNumberDialog, {
        props: {
          ...defaultProps,
          dialogName: '',
        },
      })

      // 直接inputNum関数を呼ぶ
      const vm = wrapper.vm as any
      expect(() => vm.inputNum(undefined)).not.toThrow()
    })
  })

  describe('スタイリング', () => {
    it('数値ボタンが3x3のグリッドレイアウトになっている', () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      const gridContainer = wrapper.find('.grid.grid-cols-3')
      expect(gridContainer.exists()).toBe(true)

      // 数字ボタン（0-9）とマイナス・クリアボタンで12個
      const gridButtons = gridContainer.findAll('button')
      expect(gridButtons.length).toBeGreaterThanOrEqual(10) // 最低でも0-9の10個
    })

    it('確定・キャンセルボタンが2列レイアウトになっている', () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      const actionContainer = wrapper.find('.grid.grid-cols-2')
      expect(actionContainer.exists()).toBe(true)

      const actionButtons = actionContainer.findAll('button')
      expect(actionButtons).toHaveLength(2)
      expect(actionButtons[0].text()).toBe('キャンセル')
      expect(actionButtons[1].text()).toBe('入力')
    })

    it('ダイアログが中央配置される', () => {
      const wrapper = mount(InputNumberDialog, {
        props: defaultProps,
      })

      const centerContainer = wrapper.find('.flex.h-full.items-center.justify-center')
      expect(centerContainer.exists()).toBe(true)
    })
  })
})
