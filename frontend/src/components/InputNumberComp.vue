<script setup lang="ts">
import { ref } from 'vue'

const inputNumber = ref('0')
const negativeSign = ref(false)

interface Props {
  btnName: string
  minNumber: number
  maxNumber: number
}
const props = defineProps<Props>()

interface Emits {
  (e: 'setNumber', inputNumberPayload: { number: number; name: string }): void
  (e: 'closeDialog', closeDialog: boolean): void
}
const emit = defineEmits<Emits>()

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
  inputNumber.value = '0'
  negativeSign.value = false
  emit('closeDialog', false)
}

const inputNum = () => {
  const num = Number(inputNumber.value)

  if (num > props.maxNumber) {
    emit('setNumber', { number: props.maxNumber, name: props.btnName })
  } else if (num < props.minNumber) {
    emit('setNumber', { number: props.minNumber, name: props.btnName })
  } else {
    emit('setNumber', { number: num, name: props.btnName })
  }

  closeDialog()
}
</script>

<template>
  <div class="flex w-full h-[calc(100vh-4rem)] items-center justify-center z-50 bg-black/50">
    <div class="relative w-72 bg-white rounded-md p-5 text-center">
      <div class="mt-2">数値を入力してください</div>
      <div class="text-red-500">最小値{{ props.minNumber }}、最大値{{ props.maxNumber }}</div>
      <div class="text-3xl font-semibold my-3">
        {{ inputNumber !== '-' ? Number(inputNumber) : 0 }}
      </div>
      <div class="grid grid-cols-3 gap-4 justify-items-center mx-3">
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('7')">
          7
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('8')">
          8
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('9')">
          9
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('4')">
          4
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('5')">
          5
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('6')">
          6
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('1')">
          1
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('2')">
          2
        </button>
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('3')">
          3
        </button>
        <button
          v-if="props.minNumber < 0"
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
        <button class="border w-full h-12 hover:bg-slate-50 rounded-md" @click="onClickNumBtn('0')">
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
          @click="inputNum"
        >
          入力
        </button>
      </div>
    </div>
  </div>
</template>
