<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DialogType } from '@/types/common.type'

const gridParams = {
  rotationAngle: { min: 0, max: 90 },
  gridEW: { min: 10, max: 50 },
  gridNS: { min: 10, max: 50 },
  buffer: { min: -20, max: 20 },
  baseFertilizationAmount: { min: 1, max: 999 },
  variableFertilizationRangeRate: { min: 0, max: 100 },
}

const dialogName = defineModel<DialogType>('dialogName')
const inputNumber = ref('0')
const hasFunctionButtonUsed = ref(false)

const gridRotationAngle = defineModel('gridRotationAngle')
const gridEW = defineModel('gridEW')
const gridNS = defineModel('gridNS')
const buffer = defineModel('buffer')
const baseFertilizationAmount = defineModel('baseFertilizationAmount')
const variableFertilizationRangeRate = defineModel('variableFertilizationRangeRate')

// モデルマップ: dialogName から対応するモデルへの参照
const modelMap = {
  rotationAngle: gridRotationAngle,
  gridEW: gridEW,
  gridNS: gridNS,
  buffer: buffer,
  baseFertilizationAmount: baseFertilizationAmount,
  variableFertilizationRangeRate: variableFertilizationRangeRate,
}

const inputMaxNumber = computed(() => {
  const currentDialog = dialogName.value
  if (!currentDialog) return 999
  return gridParams[currentDialog].max
})

const inputMinNumber = computed(() => {
  const currentDialog = dialogName.value
  if (!currentDialog) return 0
  return gridParams[currentDialog].min
})

// ダイアログのリセット
const resetDialog = () => {
  dialogName.value = ''
  inputNumber.value = '0'
  hasFunctionButtonUsed.value = false
}

// 入力内容の確定
const inputNum = (currentDialog: DialogType | undefined) => {
  if (!currentDialog || !(currentDialog in modelMap)) return

  const num = Number(inputNumber.value)
  const applyNumber = Math.min(Math.max(num, inputMinNumber.value), inputMaxNumber.value)

  modelMap[currentDialog].value = applyNumber
  resetDialog()
}

const onClickNumBtn = (num: string) => {
  inputNumber.value += num
  // rotationAngle以外は機能ボタン（-）を使用済みにする
  if (dialogName.value !== 'rotationAngle') {
    hasFunctionButtonUsed.value = true
  }
}

const onClickClearBtn = () => {
  inputNumber.value = '0'
  hasFunctionButtonUsed.value = false
}

const onClickFunctionBtn = () => {
  if (dialogName.value === 'buffer') {
    inputNumber.value = '-'
    hasFunctionButtonUsed.value = true
    return
  }
  if (dialogName.value === 'rotationAngle') {
    inputNumber.value += '.'
    hasFunctionButtonUsed.value = true
    return
  }
}

const closeDialog = () => {
  resetDialog()
}
</script>

<template>
  <div v-show="dialogName !== ''" class="fixed top-0 left-0 w-screen h-screen bg-black/50 z-50">
    <div class="flex h-full items-center justify-center">
      <div class="relative w-72 bg-white rounded-md p-5 text-center">
        <div class="mt-2">数値を入力してください</div>
        <div class="text-red-500">最小値{{ inputMinNumber }}、最大値{{ inputMaxNumber }}</div>
        <div class="text-3xl font-semibold my-3">
          {{ inputNumber !== '-' ? Number(inputNumber) : 0 }}
        </div>
        <div class="grid grid-cols-3 gap-4 justify-items-center mx-3">
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('7')"
          >
            7
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('8')"
          >
            8
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('9')"
          >
            9
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('4')"
          >
            4
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('5')"
          >
            5
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('6')"
          >
            6
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('1')"
          >
            1
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('2')"
          >
            2
          </button>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('3')"
          >
            3
          </button>
          <!-- 機能ボタン（-/.）or 空のプレースホルダー -->
          <button
            v-if="dialogName === 'buffer' || dialogName === 'rotationAngle'"
            :class="[
              hasFunctionButtonUsed
                ? 'bg-white text-white border-white'
                : 'bg-slate-50 hover:bg-slate-100 ',
              'border w-full h-12 text-center rounded-md ',
            ]"
            @click="onClickFunctionBtn"
            :disabled="hasFunctionButtonUsed"
          >
            <span v-if="dialogName === 'buffer'">-</span>
            <span v-else>.</span>
          </button>
          <span v-else></span>
          <!-- 0ボタン（常に中央） -->
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('0')"
          >
            0
          </button>
          <!-- Cボタン（常に右） -->
          <button
            class="border w-full h-12 text-center rounded-md bg-slate-50 hover:bg-slate-100"
            @click="onClickClearBtn"
          >
            C
          </button>
        </div>
        <div class="grid grid-cols-2 gap-4 justify-center mx-3 mt-5 mb-3">
          <button
            class="border w-full h-12 bg-slate-50 hover:bg-slate-100 rounded-md"
            @click="closeDialog"
          >
            キャンセル
          </button>
          <button
            class="border w-full h-12 bg-amber-300 hover:bg-amber-400 rounded-md"
            @click="inputNum(dialogName)"
          >
            入力
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
