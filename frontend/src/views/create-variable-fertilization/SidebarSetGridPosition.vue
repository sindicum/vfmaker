<script setup lang="ts">
import { ref } from 'vue'
import StepStatusHeader from './components/StepStatusHeader.vue'
import InputNumberDialog from './components/InputNumberDialog.vue'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'

import type { dialogType } from '@/types/maplibre'

const currentDialogName = ref<dialogType>('')

const step2Status = defineModel('step2Status')
const gridRotationAngle = defineModel('gridRotationAngle')
const gridEW = defineModel('gridEW')
const gridNS = defineModel('gridNS')
const buffer = defineModel('buffer')

const { isDesktop } = useControlScreenWidth()

const gridParams = {
  rotationAngle: { min: 0, max: 90 },
  gridEW: { min: 10, max: 50 },
  gridNS: { min: 10, max: 50 },
  buffer: { min: -20, max: 20 },
}

// ボタン入力ダイアログを表示
const onClickDialog = (dialogName: dialogType) => {
  currentDialogName.value = dialogName
}

// Step3に進む
const toStep3 = () => {
  step2Status.value = 'complete'
}

// Step1に戻る
const returnStep1 = () => {
  step2Status.value = 'upcoming'
}
</script>

<template>
  <div v-if="isDesktop || step2Status === 'current'" class="grid-cols-1 grid items-center">
    <StepStatusHeader id="2" name="グリッドの作成" v-model:current-step-status="step2Status" />

    <div
      :class="[
        step2Status === 'current' ? 'max-h-96  overflow-auto' : 'max-h-0  overflow-hidden',
        'px-5 transition-all duration-500',
      ]"
    >
      <div class="text-rose-600 my-4">回転角度・グリッド幅を調整</div>
      <div
        :class="[
          isDesktop
            ? 'grid-cols-[7fr_2fr_4fr] col-span-1 gap-y-3'
            : 'grid-cols-[7fr_3fr_7fr_3fr] col-span-2 gap-y-1',
          'grid  items-center',
        ]"
      >
        <label class="">回転角度(°)</label>
        <input
          v-show="isDesktop"
          :class="[
            currentDialogName === 'rotationAngle' ? ' bg-amber-300' : 'bg-white',
            'w-10 mr-1 rounded-md border',
          ]"
          @click="onClickDialog('rotationAngle')"
          type="button"
          v-model="gridRotationAngle"
        />
        <input
          class="w-14 lg:w-full"
          type="range"
          :min="gridParams.rotationAngle.min"
          :max="gridParams.rotationAngle.max"
          v-model="gridRotationAngle"
        />

        <label>グリッド幅EW(m)</label>
        <input
          :class="[
            currentDialogName === 'gridEW' ? ' bg-amber-300' : 'bg-white',
            'w-10 mr-1 rounded-md border',
          ]"
          @click="onClickDialog('gridEW')"
          type="button"
          v-model="gridEW"
        />
        <input
          v-show="isDesktop"
          class="w-full"
          type="range"
          :min="gridParams.gridEW.min"
          :max="gridParams.gridNS.max"
          v-model="gridEW"
        />

        <label>グリッド幅NS(m)</label>
        <input
          :class="[
            currentDialogName === 'gridNS' ? ' bg-amber-300' : 'bg-white',
            'w-10 mr-1 rounded-md border',
          ]"
          @click="onClickDialog('gridNS')"
          type="button"
          v-model="gridNS"
        />
        <input
          v-show="isDesktop"
          class="w-full"
          type="range"
          :min="gridParams.gridNS.min"
          :max="gridParams.gridNS.max"
          v-model="gridNS"
        />

        <label>バッファー(m)</label>
        <input
          :class="[
            currentDialogName === 'buffer' ? ' bg-amber-300' : 'bg-white',
            'w-10 mr-1 rounded-md border',
          ]"
          @click="onClickDialog('buffer')"
          type="button"
          v-model="buffer"
        />
        <input
          v-show="isDesktop"
          class="w-full"
          type="range"
          :min="gridParams.buffer.min"
          :max="gridParams.buffer.max"
          v-model="buffer"
        />
      </div>
      <div class="grid grid-cols-2 gap-3 col-span-2 lg:col-span-1 justify-center my-4">
        <button
          class="p-2 rounded-md bg-white ring-1 ring-inset ring-gray-300"
          @click="returnStep1"
        >
          戻る
        </button>
        <button
          class="p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-white"
          @click="toStep3"
        >
          <span>進む</span>
        </button>
      </div>
    </div>
    <InputNumberDialog
      v-model:dialog-name="currentDialogName"
      v-model:grid-rotation-angle="gridRotationAngle"
      v-model:grid-e-w="gridEW"
      v-model:grid-n-s="gridNS"
      v-model:buffer="buffer"
    />
  </div>
</template>
