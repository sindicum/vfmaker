<script setup lang="ts">
import { ref } from 'vue'
import StepStatusHeader from './components/StepStatusHeader.vue'
import InputNumberDialog from './components/InputNumberDialog.vue'
import { useStore } from '@/stores/store'
import type { dialogType } from '@/types/maplibre'
import { useControlScreenWidth } from '@/components/useControlScreenWidth'

const currentDialogName = ref<dialogType>('')
const store = useStore()

const step3Status = defineModel('step3Status')
const baseFertilizationAmount = defineModel('baseFertilizationAmount')
const variableFertilizationRangeRate = defineModel('variableFertilizationRangeRate')
const applicationGridFeatures = defineModel('applicationGridFeatures')

const { isDesktop } = useControlScreenWidth()

const gridParams = {
  baseFertilizationAmount: { min: 1, max: 999 },
  variableFertilizationRangeRate: { min: 0, max: 100 },
}

// ボタン入力ダイアログを表示
const onClickDialog = (dialogName: dialogType) => {
  currentDialogName.value = dialogName
}

// Stepの終了（可変施肥マップを出力しStep1に戻る）
const endStep = () => {
  exportVfm()
  step3Status.value = 'complete'
}

// Step2に戻る
const returnStep2 = () => {
  step3Status.value = 'upcoming'
}

// 可変施肥マップの出力
async function exportVfm() {
  const url = import.meta.env.VITE_API_URL
  store.isLoading = true
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'FeatureCollection',
      features: applicationGridFeatures.value,
    }),
  })
  if (!res.ok) {
    store.alertMessage.alertType = 'Error'
    store.alertMessage.message = 'HTTPエラー' + res.status
  } else {
    const json = await res.json()
    const downloadUrl = json.download_url

    // 自動でダウンロードを実行
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = '' // ファイル名を指定しない場合、元のファイル名が使われる
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    store.alertMessage.alertType = 'Info'
    store.alertMessage.message = '可変施肥マップを出力しました'
  }
  store.isLoading = false
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
            : 'grid-cols-[7fr_3fr_7fr_3fr] col-span-2 gap-y-1',
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
      <div class="grid grid-cols-2 gap-3 justify-center my-4">
        <button
          class="p-2 rounded-md bg-white ring-1 ring-inset ring-gray-300"
          @click="returnStep2"
        >
          戻る
        </button>
        <button
          class="p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-white"
          @click="endStep"
        >
          <span>ファイル出力</span>
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
