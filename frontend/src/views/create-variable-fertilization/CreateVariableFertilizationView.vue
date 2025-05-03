<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore, usePersistStore } from '@/stores/store'

import MapBase from '@/components/map/MapBase.vue'
import selectField from './SidebarSelectField.vue'
import setGridPosition from './SidebarSetGridPosition.vue'
import exportVfm from './SidebarExportVfm.vue'
import {
  addSource,
  addLayer,
  removeHumusGrig,
  removeBaseMesh,
  removeVraMap,
} from './handler/LayerHandler'
import { useGridHandler } from './handler/useGridHandler'
import { useVfmHandler } from './handler/useVfmHandler'
import { useControlScreenWidth } from '@/components/useControlScreenWidth'

import type { MapMouseEvent, MaplibreRef } from '@/types/maplibre'
type StepStatus = 'upcoming' | 'current' | 'complete'

const map = inject<MaplibreRef>('mapkey')
if (!map) throw new Error('Map instance not provided')

const store = useStore()
const persistStore = usePersistStore()
const { isDesktop } = useControlScreenWidth()

const step1Status = ref<StepStatus>('current')
const step2Status = ref<StepStatus>('upcoming')
const step3Status = ref<StepStatus>('upcoming')

// グリッド編集状態
const isInEdit = ref(false)

const { gridRotationAngle, gridEW, gridNS, buffer, humusPoint, baseMesh, onClickField } =
  useGridHandler(map)

const {
  createVfm,
  baseFertilizationAmount,
  variableFertilizationRangeRate,
  applicationGridFeatures,
} = useVfmHandler(map)

onMounted(() => {
  const currentMap = map?.value
  if (currentMap) {
    currentMap.on('style.load', () => {
      addSource(currentMap, persistStore.featurecollection)
      addLayer(currentMap)
      currentMap.on('click', 'registeredFillLayer', mapClickHandler)
    })
  }
})

onUnmounted(() => {
  const currentMap = map?.value
  if (currentMap) {
    currentMap.off('click', 'registeredFillLayer', mapClickHandler)
  }
})

watch(step1Status, (currentStatus, previousStatus) => {
  if (previousStatus === 'current' && currentStatus === 'complete') {
    delayedUpdateSidebar(step2Status, 'current')
  }
  // Step2 or Step3 -> Step1
  if (currentStatus === 'current') {
    isInEdit.value = false
  }
})

watch(step2Status, (currentStatus, previousStatus) => {
  const currentMap = map?.value

  // Step2 -> Step3
  if (previousStatus === 'current' && currentStatus == 'complete') {
    createVfm(baseMesh.value, humusPoint.value)

    delayedUpdateSidebar(step3Status, 'current')
  }

  // Step2 -> Step1
  if (previousStatus === 'current' && currentStatus === 'upcoming') {
    delayedUpdateSidebar(step1Status, 'current')

    if (currentMap) {
      removeHumusGrig(currentMap)
      removeBaseMesh(currentMap)
    }
  }
})

watch(step3Status, (currentStatus, previousStatus) => {
  const currentMap = map?.value

  // Step3 -> Step1
  if (previousStatus === 'current' && currentStatus == 'complete') {
    delayedUpdateSidebar(step1Status, 'current')
    delayedUpdateSidebar(step2Status, 'upcoming')
    delayedUpdateSidebar(step3Status, 'upcoming')

    if (currentMap) {
      removeHumusGrig(currentMap)
      removeBaseMesh(currentMap)
      removeVraMap(currentMap)
    }
  }

  // Step3 -> Step2
  if (previousStatus === 'current' && currentStatus === 'upcoming') {
    if (currentMap) {
      removeVraMap(currentMap)
    }
    delayedUpdateSidebar(step2Status, 'current')
  }
})

watch(
  () => store.mapStyleIndex,
  () => {
    const currentMap = map?.value

    if (currentMap) {
      currentMap.once('idle', () => {
        addSource(currentMap, persistStore.featurecollection)
        addLayer(currentMap)
        // サイドバーの設定を初期化
        step1Status.value = 'current'
        step2Status.value = 'upcoming'
        step3Status.value = 'upcoming'
      })
    }
  },
)

/**
 * マップクリックによりonClickField()を呼び出す
 * @param e マップクリックイベント
 */
async function mapClickHandler(e: MapMouseEvent) {
  // エディット中は他の圃場操作を受け付けない
  if (isInEdit.value) return
  isInEdit.value = true
  await onClickField(e).catch((error) => {
    store.alertMessage.message = error
  })
  step1Status.value = 'complete'
}

/**
 * 指定されたリアクティブ変数を、指定した値に一定の遅延時間後に更新する
 * @param refVar 更新対象のref
 * @param newValue 新しい値
 */
function delayedUpdateSidebar(refVar: { value: string }, newValue: string) {
  // サイドバーアニメーションの遅延処理(ms)
  const TRANSITION_DELAY = 500
  setTimeout(() => {
    refVar.value = newValue
  }, TRANSITION_DELAY)
}
</script>

<template>
  <main class="h-[calc(100dvh-4rem)] w-screen md:flex">
    <!-- sidebar -->
    <div
      :class="[
        isDesktop
          ? 'relative p-8 h-full bg-slate-100 min-w-84'
          : 'absolute p-2 m-2 w-[calc(100%-1rem)] bg-slate-100/80 rounded-md',
        'block z-20',
      ]"
    >
      <div :class="[isDesktop ? 'mt-2 mb-6 text-center' : 'hidden', 'font-semibold']">
        可変施肥マップの作成
      </div>
      <ol
        role="list"
        :class="[
          isDesktop ? 'divide-y divide-gray-300 rounded-md border border-gray-300' : 'text-sm',
        ]"
      >
        <li>
          <selectField v-model:step1-status="step1Status" />
        </li>

        <li>
          <setGridPosition
            v-model:step2-status="step2Status"
            v-model:grid-rotation-angle="gridRotationAngle"
            v-model:grid-e-w="gridEW"
            v-model:grid-n-s="gridNS"
            v-model:buffer="buffer"
          />
        </li>

        <li>
          <exportVfm
            v-model:step3-status="step3Status"
            v-model:base-fertilization-amount="baseFertilizationAmount"
            v-model:variable-fertilization-range-rate="variableFertilizationRangeRate"
            v-model:application-grid-features="applicationGridFeatures"
          />
        </li>
      </ol>
    </div>

    <!-- main map -->
    <div class="h-full w-full">
      <MapBase />
    </div>
  </main>
</template>
