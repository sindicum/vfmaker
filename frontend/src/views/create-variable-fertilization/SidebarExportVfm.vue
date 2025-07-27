<script setup lang="ts">
import { ref, watch } from 'vue'
import StepStatusHeader from './components/StepStatusHeader.vue'
import InputNumberDialog from './components/InputNumberDialog.vue'
import VfmSaveDialog from './components/VfmSaveDialog.vue'
import { usePersistStore } from '@/stores/persistStore'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'

import type { dialogType } from '@/types/maplibre'
import type { Feature, Polygon, GeoJsonProperties } from 'geojson'

const currentDialogName = ref<dialogType>('')
const persistStore = usePersistStore()

const area = defineModel<number>('area')
const step3Status = defineModel<string>('step3Status')
const baseFertilizationAmount = defineModel<number>('baseFertilizationAmount')
const variableFertilizationRangeRate = defineModel<number>('variableFertilizationRangeRate')
const applicationGridFeatures =
  defineModel<Feature<Polygon, GeoJsonProperties>[]>('applicationGridFeatures')
const totalAmount = defineModel<number>('totalAmount')
const activeFeatureId = defineModel<string>('activeFeatureId')

const { isDesktop } = useControlScreenWidth()

const isOpenVfmSaveDialog = ref(false)
const isOverwriteSave = ref(false)

const gridParams = {
  baseFertilizationAmount: { min: 1, max: 999 },
  variableFertilizationRangeRate: { min: 1, max: 99 },
}

// ボタン入力ダイアログを表示
const onClickDialog = (dialogName: dialogType) => {
  currentDialogName.value = dialogName
}

// Step2に戻る
const returnStep2 = () => {
  step3Status.value = 'upcoming'
}

// VfmSaveDialogの状態変化を監視し、上書き保存の場合は保存処理を実行
watch([isOverwriteSave], () => {
  if (isOverwriteSave.value) {
    // 同一IDのマップを削除
    persistStore.variableFertilizationMaps = persistStore.variableFertilizationMaps.filter(
      (v) => v.id !== activeFeatureId.value,
    )
    executeSave()
    isOverwriteSave.value = false
  }
})

// 保存処理を実行
const executeSave = () => {
  persistStore.addVariableFertilizationMap(
    applicationGridFeatures.value ?? [],
    activeFeatureId.value ?? '',
    Math.round(totalAmount.value ?? 0),
    Math.round(area.value ?? 0) / 100,
  )

  // Step1に戻る
  step3Status.value = 'complete'
}

// 可変施肥マップの保存
const saveVfm = () => {
  // 同一IDが存在するかチェック
  const existingVfm = persistStore.variableFertilizationMaps.find(
    (v) => v.id === activeFeatureId.value,
  )

  // 同一IDのマップが存在する場合はダイアログを表示
  if (existingVfm) {
    isOpenVfmSaveDialog.value = true
    return
  }
  // 同一IDのマップがない場合は保存処理を実行
  executeSave()
}
</script>

<template>
  <div v-if="isDesktop || step3Status === 'current'" class="grid-cols-1 grid items-center">
    <StepStatusHeader
      id="3"
      name="施肥量の決定とファイル出力"
      v-model:current-step-status="step3Status"
    />

    <div
      :class="[
        step3Status === 'current' ? 'max-h-96  overflow-auto' : 'max-h-0  overflow-hidden',
        'px-5 transition-all duration-500',
      ]"
    >
      <div class="text-rose-600 my-4">基準施肥量および可変量を入力</div>

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
          v-model="variableFertilizationRangeRate"
        />
      </div>
      <div
        :class="[
          isDesktop ? 'grid-cols-2 gap-3 ' : 'grid-cols-4',
          'grid my-3 items-center font-bold text-sky-600',
        ]"
      >
        <label>合計施肥量</label>
        <div :class="[isDesktop ? '' : 'text-center']">{{ Math.round(totalAmount ?? 0) }} kg</div>

        <label>概算面積</label>
        <div :class="[isDesktop ? '' : 'text-center']">{{ Math.round((area ?? 0) / 100) }} a</div>
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
          @click="saveVfm"
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
  <VfmSaveDialog
    v-model:is-open-vfm-save-dialog="isOpenVfmSaveDialog"
    v-model:is-overwrite-save="isOverwriteSave"
  />
</template>
