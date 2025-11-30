<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DialogType } from '@/types/common.type'

const gridParams = {
  rotationAngle: { min: 0, max: 90 },
  gridEW: { min: 10, max: 50 },
  gridNS: { min: 10, max: 50 },
  buffer: { min: -20, max: 20 },
  baseFertilizationAmount: { min: 1, max: 999 },
  variableFertilizationRangeRate: { min: 1, max: 99 },
}
const dialogName = defineModel<DialogType>('dialogName')
const inputNumber = ref('0')
const negativeSign = ref(false)

const gridRotationAngle = defineModel('gridRotationAngle')
const gridEW = defineModel('gridEW')
const gridNS = defineModel('gridNS')
const buffer = defineModel('buffer')
const baseFertilizationAmount = defineModel('baseFertilizationAmount')
const variableFertilizationRangeRate = defineModel('variableFertilizationRangeRate')

const inputMaxNumber = computed(() => {
  const currentDialog = dialogName.value
  if (currentDialog === 'rotationAngle') {
    return gridParams.rotationAngle.max
  }
  if (currentDialog === 'gridEW') {
    return gridParams.gridEW.max
  }
  if (currentDialog === 'gridNS') {
    return gridParams.gridNS.max
  }
  if (currentDialog === 'buffer') {
    return gridParams.buffer.max
  }
  if (currentDialog === 'baseFertilizationAmount') {
    return gridParams.baseFertilizationAmount.max
  }
  if (currentDialog === 'variableFertilizationRangeRate') {
    return gridParams.variableFertilizationRangeRate.max
  }
  return 999
})

const inputMinNumber = computed(() => {
  const currentDialog = dialogName.value
  if (currentDialog === 'rotationAngle') {
    return gridParams.rotationAngle.min
  }
  if (currentDialog === 'gridEW') {
    return gridParams.gridEW.min
  }
  if (currentDialog === 'gridNS') {
    return gridParams.gridNS.min
  }
  if (currentDialog === 'buffer') {
    return gridParams.buffer.min
  }
  if (currentDialog === 'baseFertilizationAmount') {
    return gridParams.baseFertilizationAmount.min
  }
  if (currentDialog === 'variableFertilizationRangeRate') {
    return gridParams.variableFertilizationRangeRate.min
  }
  return 0
})

// 入力内容の確定
const inputNum = (currentDialog: DialogType | undefined) => {
  // undefinedハンドリング
  if (!currentDialog) return

  const num = Number(inputNumber.value)
  let applyNumber
  if (num > inputMaxNumber.value) {
    applyNumber = inputMaxNumber.value
  } else if (num < inputMinNumber.value) {
    applyNumber = inputMinNumber.value
  } else {
    applyNumber = num
  }

  if (currentDialog === 'rotationAngle') {
    gridRotationAngle.value = applyNumber
  }
  if (currentDialog === 'gridEW') {
    gridEW.value = applyNumber
  }
  if (currentDialog === 'gridNS') {
    gridNS.value = applyNumber
  }
  if (currentDialog === 'buffer') {
    buffer.value = applyNumber
  }
  if (currentDialog === 'baseFertilizationAmount') {
    baseFertilizationAmount.value = applyNumber
  }
  if (currentDialog === 'variableFertilizationRangeRate') {
    variableFertilizationRangeRate.value = applyNumber
  }
  dialogName.value = ''
  inputNumber.value = '0'
  negativeSign.value = false
}

const onClickNumBtn = (num: string) => {
  inputNumber.value += num
  negativeSign.value = true
}

const onClickClearBtn = () => {
  inputNumber.value = '0'
  negativeSign.value = false
}

const onClickMinusBtn = () => {
  inputNumber.value = '-'
  negativeSign.value = true
}

const closeDialog = () => {
  dialogName.value = ''
  inputNumber.value = '0'
  negativeSign.value = false
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
          <button
            v-if="inputMinNumber < 0"
            :class="[
              negativeSign ? 'bg-white text-white border-white' : 'bg-slate-50 hover:bg-slate-100 ',
              'border w-full h-12 text-center rounded-md ',
            ]"
            @click="onClickMinusBtn"
            :disabled="negativeSign"
          >
            -
          </button>
          <span v-else></span>
          <button
            class="border w-full h-12 hover:bg-slate-50 rounded-md"
            @click="onClickNumBtn('0')"
          >
            0
          </button>
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
