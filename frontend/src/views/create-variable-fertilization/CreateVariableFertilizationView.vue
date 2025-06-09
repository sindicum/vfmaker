<script setup lang="ts">
import { inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useStore } from '@/stores/store'
import { usePersistStore } from '@/stores/persistStore'
import { useConfigPersistStore } from '@/stores/configPersistStore'

import MapBase from '@/components/map/MapBase.vue'
import HumusMapLegend from '@/components/map/HumusMapLegend.vue'
import selectField from './SidebarSelectField.vue'
import setGridPosition from './SidebarSetGridPosition.vue'
import exportVfm from './SidebarExportVfm.vue'
import {
  addSource,
  addLayer,
  removeLayer,
  removeSource,
  removeHumusGrig,
  removeBaseMesh,
  removeVraMap,
  addHumusGrid,
  addBaseMesh,
} from './handler/LayerHandler'
import { useGridHandler } from './handler/useGridHandler'
import { useVfmHandler } from './handler/useVfmHandler'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'

import {
  intersect as turfIntersect,
  featureCollection as turfFeatureCollection,
  area as turfArea,
} from '@turf/turf'

import { Cog8ToothIcon } from '@heroicons/vue/24/solid'
import VfmConfigComp from './components/VfmConfigComp.vue'

import type { MapMouseEvent, MaplibreRef } from '@/types/maplibre'
import type { Feature, Polygon } from 'geojson'
import type { AreaPolygon } from '@/types/geom'
type StepStatus = 'upcoming' | 'current' | 'complete'

const map = inject<MaplibreRef>('mapkey')
if (!map) throw new Error('Map instance not provided')

const store = useStore()
const persistStore = usePersistStore()
const configPersistStore = useConfigPersistStore()

const { isDesktop } = useControlScreenWidth()

const step1Status = ref<StepStatus>('current')
const step2Status = ref<StepStatus>('upcoming')
const step3Status = ref<StepStatus>('upcoming')

// 設定ダイアログの表示
const isOpenConfig = ref(false)

// グリッド編集状態
const isInEdit = ref(false)

const {
  activeFeature,
  gridRotationAngle,
  gridEW,
  gridNS,
  buffer,
  humusPoint,
  baseMesh,
  onClickField,
} = useGridHandler(map)

const {
  createVfm,
  baseFertilizationAmount,
  variableFertilizationRangeRate,
  applicationGridFeatures,
  totalArea,
  totalAmount,
} = useVfmHandler(map)

onMounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (mapInstance) {
    mapInstance.on('style.load', () => {
      addSource(mapInstance, persistStore.featurecollection)
      addLayer(mapInstance)
      mapInstance.on('click', 'registeredFillLayer', mapClickHandler)
    })
  }
})

onBeforeUnmount(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  removeLayer(mapInstance)
  removeSource(mapInstance)
  removeHumusGrig(mapInstance)
  removeBaseMesh(mapInstance)
  removeVraMap(mapInstance)

  mapInstance.off('click', 'registeredFillLayer', mapClickHandler)

  step1Status.value = 'current'
  step2Status.value = 'upcoming'
  step3Status.value = 'upcoming'
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
  const mapInstance = map?.value
  if (!mapInstance) return

  const fiveStepsFertilizationState = configPersistStore.fiveStepsFertilization

  // Step2 -> Step3
  if (previousStatus === 'current' && currentStatus == 'complete') {
    if (configPersistStore.outsideMeshClip) {
      if (!baseMesh.value?.features || !activeFeature.value) {
        console.warn('必要なデータが不足しています')
        return
      }

      const intersections: AreaPolygon[] = baseMesh.value.features
        .map((meshFeature: AreaPolygon): AreaPolygon | null => {
          try {
            const intersection = turfIntersect(
              turfFeatureCollection([
                meshFeature as Feature<Polygon>,
                activeFeature.value! as Feature<Polygon>,
              ]),
            )

            if (!intersection || intersection.geometry.type !== 'Polygon') {
              return null
            }

            const area = turfArea(intersection)
            const result: Feature<Polygon, { area: number }> = {
              type: 'Feature',
              geometry: intersection.geometry as Polygon,
              properties: {
                area,
              },
            }

            return result
          } catch (error) {
            console.warn('交差計算エラー:', error)
            return null
          }
        })
        .filter((feature): feature is Feature<Polygon, { area: number }> => feature !== null)

      createVfm(
        { type: 'FeatureCollection', features: intersections },
        humusPoint.value,
        fiveStepsFertilizationState,
      )
    } else {
      createVfm(baseMesh.value, humusPoint.value, fiveStepsFertilizationState)
    }

    delayedUpdateSidebar(step3Status, 'current')

    if (mapInstance) {
      removeHumusGrig(mapInstance)
      removeBaseMesh(mapInstance)
    }
  }

  // Step2 -> Step1
  if (previousStatus === 'current' && currentStatus === 'upcoming') {
    delayedUpdateSidebar(step1Status, 'current')

    if (mapInstance) {
      removeHumusGrig(mapInstance)
      removeBaseMesh(mapInstance)
    }
  }
})

watch(step3Status, (currentStatus, previousStatus) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  // Step3 -> Step1
  if (previousStatus === 'current' && currentStatus == 'complete') {
    delayedUpdateSidebar(step1Status, 'current')
    delayedUpdateSidebar(step2Status, 'upcoming')
    delayedUpdateSidebar(step3Status, 'upcoming')

    if (mapInstance) {
      removeHumusGrig(mapInstance)
      removeBaseMesh(mapInstance)
      removeVraMap(mapInstance)
    }
  }

  // Step3 -> Step2（Step3でのマップ切り替え時を除く）
  if (
    previousStatus === 'current' &&
    currentStatus === 'upcoming' &&
    step1Status.value !== 'current'
  ) {
    if (mapInstance) {
      removeVraMap(mapInstance)
      addHumusGrid(mapInstance, humusPoint.value)
      addBaseMesh(mapInstance, baseMesh.value)
    }
    delayedUpdateSidebar(step2Status, 'current')
  }
})

// 背景地図切り替え時の処理
watch(
  () => store.mapStyleIndex,
  () => {
    const currentMap = map?.value

    if (currentMap) {
      currentMap.once('idle', () => {
        addSource(currentMap, persistStore.featurecollection)
        addLayer(currentMap)

        // サイドバーの設定を初期化
        step3Status.value = 'upcoming'
        step2Status.value = 'upcoming'
        step1Status.value = 'current'
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
  <main class="fixed top-16 h-[calc(100dvh-4rem)] w-screen lg:flex">
    <!-- sidebar -->
    <div
      :class="[
        isDesktop
          ? 'relative p-8 h-full bg-slate-100 min-w-90'
          : 'absolute p-2 m-2 w-[calc(100%-1rem)] min-h-10 bg-slate-100/80 rounded-md',
        'block z-20',
      ]"
    >
      <div :class="[isDesktop ? 'top-10 right-8 ' : 'top-2 right-2', 'absolute']">
        <button
          class="flex items-center border border-gray-300 rounded bg-gray-200"
          @click="isOpenConfig = true"
          :disabled="step3Status === 'current'"
        >
          <Cog8ToothIcon
            :class="[
              step3Status === 'current' ? 'text-gray-300' : 'text-gray-700',
              'w-5 h-5 py-0.5 ',
            ]"
          />
          <div class="text-xs pr-1">設定</div>
        </button>
      </div>

      <div :class="[isDesktop ? 'mt-2 mb-6 text-center' : 'hidden', 'font-semibold']">
        <span>可変施肥マップの作成</span>
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
            v-model:total-amount="totalAmount"
            v-model:area="totalArea"
          />
        </li>
      </ol>
    </div>

    <MapBase />
    <HumusMapLegend
      v-show="step3Status !== 'current'"
      class="absolute top-1/2 -translate-y-1/2 right-3"
    />
    <VfmConfigComp v-model:is-open-config="isOpenConfig" />
  </main>
</template>
