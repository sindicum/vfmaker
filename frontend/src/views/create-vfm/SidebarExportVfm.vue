<script setup lang="ts">
import { ref, toRaw } from 'vue'
import StepStatusHeader from './components/StepStatusHeader.vue'
import InputNumberDialog from './components/InputNumberDialog.vue'
import { useStore } from '@/stores/store'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'
import { useStoreHandler } from '@/stores/indexedDbStoreHandler'

import type { DialogType } from '@/types/common.type'
import type { FieldPolygonFeature } from '@/types/fieldpolygon.type'
import type { VfmapFeature } from '@/types/vfm.type'

const currentDialogName = ref<DialogType>('')
const store = useStore()

const area = defineModel<number>('area')
const step3Status = defineModel<string>('step3Status')
const baseFertilizationAmount = defineModel<number>('baseFertilizationAmount')
const variableFertilizationRangeRate = defineModel<number>('variableFertilizationRangeRate')

const vfmapFeatures = defineModel<VfmapFeature[]>('vfmapFeatures')
const totalAmount = defineModel<number>('totalAmount')
const activeFeature = defineModel<FieldPolygonFeature | null>('activeFeature')

const { isDesktop } = useControlScreenWidth()
const { createVfmMap } = useStoreHandler()

const gridParams = {
  baseFertilizationAmount: { min: 1, max: 999 },
  variableFertilizationRangeRate: { min: 1, max: 99 },
}

const vfmMemo = ref('')

// ボタン入力ダイアログを表示
const onClickDialog = (dialogName: DialogType) => {
  currentDialogName.value = dialogName
}

// Step2に戻る
const returnStep2 = () => {
  step3Status.value = 'upcoming'
}

// 保存処理を実行
const executeSave = async () => {
  if (!activeFeature.value?.properties.uuid) {
    store.setMessage('Error', '圃場が選択されていません')
    return
  }

  const vfms = {
    uuid: activeFeature.value.properties.uuid,
    vfm: {
      type: 'FeatureCollection' as const,
      features: toRaw(vfmapFeatures.value) ?? [],
    },
    amount_10a: Math.round(baseFertilizationAmount.value ?? 0),
    total_amount: Math.round(totalAmount.value ?? 0),
    area: Math.round(area.value ?? 0) / 100,
    fertilization_range: variableFertilizationRangeRate.value ?? 0,
    memo: vfmMemo.value,
  }

  await createVfmMap(vfms)
    .then(() => {
      step3Status.value = 'complete'
      vfmMemo.value = ''
      store.setMessage('Info', '可変施肥マップを保存しました')
    })
    .catch((error) => {
      store.setMessage('Error', error)
      console.error(error)
      step3Status.value = 'upcoming'
      vfmMemo.value = ''
    })
}
</script>

<template>
  <div v-if="isDesktop || step3Status === 'current'" class="grid-cols-1 grid items-center">
    <StepStatusHeader
      id="3"
      name="施肥量の決定とファイル保存"
      v-model:current-step-status="step3Status"
    />

    <div
      :class="[
        step3Status === 'current' ? 'max-h-96  overflow-auto' : 'max-h-0  overflow-hidden',
        'px-5 transition-all duration-500',
      ]"
    >
      <div class="text-rose-600 my-3">基準施肥量および可変量を入力</div>

      <div
        :class="[
          isDesktop
            ? 'grid-cols-[7fr_2fr_4fr] col-span-1 gap-y-3'
            : 'grid-cols-[7fr_3fr_7fr_3fr] col-span-2 gap-y-2',
          'grid  items-center',
        ]"
      >
        <label>基準施肥量<span v-show="!isDesktop">kg/10a</span></label>
        <input
          :class="[
            currentDialogName === 'baseFertilizationAmount' ? ' bg-amber-300' : 'bg-white',
            'w-10 mr-1 rounded-md border',
          ]"
          @click="onClickDialog('baseFertilizationAmount')"
          type="button"
          v-model="baseFertilizationAmount"
        />
        <span v-show="isDesktop">kg/10a</span>
        <label>可変施肥増減率(%)</label>
        <input
          :class="[
            currentDialogName === 'variableFertilizationRangeRate' ? ' bg-amber-300' : 'bg-white',
            'w-10 mr-1 rounded-md border',
          ]"
          @click="onClickDialog('variableFertilizationRangeRate')"
          type="button"
          v-model="variableFertilizationRangeRate"
        />
        <input
          v-show="isDesktop"
          class="w-full"
          type="range"
          :min="gridParams.variableFertilizationRangeRate.min"
          :max="gridParams.variableFertilizationRangeRate.max"
          v-model.number="variableFertilizationRangeRate"
        />
        <label>メモ</label>
        <input
          v-model="vfmMemo"
          :class="[
            isDesktop ? 'col-span-2' : 'col-span-3',
            'border rounded-md bg-white hover:bg-gray-50 px-2',
          ]"
          placeholder="任意"
          maxlength="64"
        />
      </div>
      <div
        :class="[
          isDesktop
            ? 'grid-cols-[7fr_2fr_4fr] col-span-1 gap-y-3'
            : 'grid-cols-4 col-span-2 gap-y-2',
          'grid items-center bg-amber-50 rounded-lg border border-amber-200 mt-3 p-2',
        ]"
      >
        <label class="text-amber-800">合計施肥量</label>
        <div :class="[isDesktop ? 'col-span-2' : '', 'text-amber-700']">
          {{ Math.round(totalAmount ?? 0) }} kg
        </div>

        <label class="text-amber-800">概算面積</label>
        <div :class="[isDesktop ? 'col-span-2' : '', 'text-amber-700']">
          {{ Math.round((area ?? 0) / 100) }} a
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 justify-center my-4">
        <button
          class="p-2 rounded-md bg-white ring-1 ring-inset ring-gray-300"
          @click="returnStep2"
        >
          戻る
        </button>
        <button
          class="p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-white"
          @click="executeSave"
        >
          <span>保存</span>
        </button>
      </div>
    </div>
  </div>

  <InputNumberDialog
    v-model:dialog-name="currentDialogName"
    v-model:base-fertilization-amount="baseFertilizationAmount"
    v-model:variable-fertilization-range-rate="variableFertilizationRangeRate"
  />
</template>
