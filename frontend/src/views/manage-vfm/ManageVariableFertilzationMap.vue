<script setup lang="ts">
import { onMounted, onUnmounted, inject, ref, watch, computed, type ShallowRef } from 'vue'
import MapBase from '@/components/map/MapBase.vue'
import { usePersistStore } from '@/stores/persistStore'
import { useStore } from '@/stores/store'

import {
  bbox as turfBbox,
  booleanPointInPolygon as turfBooleanPointInPolygon,
  point as turfPoint,
} from '@turf/turf'

import { addSource, addLayer, addVraMap, removeVraMap } from '../common/handler/LayerHandler'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'
import {
  useErrorHandler,
  createGeneralError,
  createNetworkError,
  createHttpError,
  createGeospatialError,
} from '@/errors'

import Dialog from '@/components/common/components/Dialog.vue'
import StepNavigationButtons from './components/StepNavigationButtons.vue'
import RealtimeFertilizationDisplay from './components/RealtimeFertilizationDisplay.vue'
import { useStepNavigation } from './composables/useStepNavigation'

import type { MaplibreMap, MapMouseEvent } from '@/types/common'
import type { FeatureCollection, Feature, Polygon } from 'geojson'

const { isDesktop } = useControlScreenWidth()
const persistStore = usePersistStore()
const store = useStore()
const { handleError } = useErrorHandler()
const {
  currentStep,
  buttonConfig,
  activeFeatureId,
  activeVfmIndex,
  nextStep,
  previousStep,
  reset,
} = useStepNavigation({
  validateStep1: validateStep1 as () => boolean,
  onBackwardToStep1: onBackwardToStep1 as () => void,
  onClearSelection: onClearSelection as () => void,
  onExecuteAction: onExecuteAction as () => void,
})

const map = inject<ShallowRef<MaplibreMap | null>>('mapkey')
if (!map) throw new Error('Map instance not provided')

const currentVfm = ref<FeatureCollection | null>(null)
const isOpenVfmDeleteDialog = ref(false)
const isDeleteVfm = ref(false)
const showRealtimeVfm = ref(false)
const selectedAction = ref('exportVfm')
const currentGridInfo = ref<{
  fertilizerAmount: number
  vfmId: string
} | null>(null)
const currentFertilizerAmount = ref<number | null>(null)

const showStep1 = computed(() => currentStep.value === 1)
const showStep2 = computed(() => currentStep.value === 2)
const showStep3 = computed(() => currentStep.value === 3)
const message = computed(() => {
  switch (currentStep.value) {
    case 1:
      return 'ポリゴンを選択'
    case 2:
      return 'VFマップを選択'
    case 3:
      return '処理内容をリストより選択'
    default:
      return ''
  }
})

onMounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return
  mapInstance.on('load', handleMapLoad)
})

onUnmounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  mapInstance.off('load', handleMapLoad)
  mapInstance.off('click', 'registeredFillLayer', mapClickField)
})

function handleMapLoad() {
  const mapInstance = map?.value
  if (!mapInstance) return

  addSource(mapInstance, persistStore.featurecollection)
  addLayer(mapInstance)

  mapInstance.on('click', 'registeredFillLayer', mapClickField)
}

function mapClickField(e: MapMouseEvent) {
  // ステップ1の場合のみ有効
  if (!showStep1.value) return

  const id = e.features?.[0]?.id
  if (id == null) return
  activeFeatureId.value = String(id)
}

const addVfm = (vfm: FeatureCollection, index: number) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  currentVfm.value = vfm
  activeVfmIndex.value = index

  addVraMap(mapInstance, currentVfm.value)
}

const exportVfm = async () => {
  const vfm = currentVfm.value
  if (!vfm) return

  // 可変施肥マップの出力処理
  const url = import.meta.env.VITE_API_URL
  const apiKey = import.meta.env.VITE_AWS_APIGATEWAY_KEY

  try {
    store.isLoading = true

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(vfm),
    })

    if (!res.ok) {
      // HTTPエラーハンドリング
      handleError(
        createHttpError(
          res.status,
          url,
          'POST',
          new Error(`HTTP ${res.status}: ${res.statusText}`),
          {
            operation: 'vfm_export',
            statusText: res.statusText,
            featureCount: vfm?.features.length,
          },
        ),
      )
      return
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
      store.setMessage('Info', '可変施肥マップを出力しました')
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      handleError(
        createNetworkError('vfm_export_network', error, {
          endpoint: url,
          operation: 'exportVfm',
          featureCount: vfm.features.length,
        }),
      )
    } else {
      handleError(
        createGeneralError(
          'VFM export failed',
          'ファイルの出力に失敗しました。しばらく待ってから再度お試しください。',
          undefined,
          error as Error,
          {
            endpoint: url,
            operation: 'exportVfm',
          },
        ),
      )
    }
  } finally {
    store.isLoading = false
  }
}

function isPolyLike(f: Feature | undefined): f is Feature<Polygon> {
  return !!f && !!f.geometry && f.geometry.type === 'Polygon'
}

const getCurrentLocationFertilizerAmount = () => {
  if (!currentVfm.value || !activeFeatureId.value) return

  // 現在位置の緯度経度を取得
  const lat = store.currentGeolocation.lat ?? null
  const lng = store.currentGeolocation.lng ?? null

  if (lat === null || lng === null) {
    currentFertilizerAmount.value = null
    return
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`)
  }

  const currentPoint = turfPoint([lng, lat])

  const currentPolygon = persistStore.featurecollection.features.find(
    (feature) => feature.properties?.id === activeFeatureId.value,
  )
  if (!isPolyLike(currentPolygon)) {
    currentFertilizerAmount.value = null
    return
  }

  const isInside = turfBooleanPointInPolygon(currentPoint, currentPolygon)
  if (!isInside) {
    currentFertilizerAmount.value = null
    return
  }

  const containing = currentVfm.value.features.find(
    (feature) => isPolyLike(feature) && turfBooleanPointInPolygon(currentPoint, feature),
  )

  if (!containing?.properties) return
  currentFertilizerAmount.value = containing.properties.amount_fertilization_unit
}

const fitToPolygon = (feature: Feature<Polygon>) => {
  if (!feature.properties) return

  activeFeatureId.value = feature.properties.id
  const mapInstance = map?.value
  if (!mapInstance) {
    handleError(
      createGeneralError(
        'Map instance not available',
        '地図が初期化されていません。',
        undefined,
        new Error('Map instance is null'),
        { operation: 'fitToPolygon', feature: feature },
      ),
    )
    return
  }

  try {
    // geometryからbboxを計算
    const originalBbox = turfBbox(feature.geometry)

    // bbox幅と高さを計算
    const bboxWidth = originalBbox[2] - originalBbox[0] // 経度の幅
    const bboxHeight = originalBbox[3] - originalBbox[1] // 緯度の幅

    if (bboxWidth <= 0 || bboxHeight <= 0) {
      throw new Error(`Invalid bbox dimensions: width=${bboxWidth}, height=${bboxHeight}`)
    }

    // ポリゴンが画面の1/3幅になるよう、左右に1倍分ずつバッファーを追加
    // （左余白：ポリゴン：右余白 = 1:1:1 の比率）
    const bufferWidth = bboxWidth * 1.0 // 左右に1倍分ずつ拡張
    const bufferHeight = bboxHeight * 0.5 // 上下は0.5倍分ずつ拡張

    // 拡張されたbboxを計算
    const expandedBbox: [number, number, number, number] = [
      originalBbox[0] - bufferWidth, // 西（最小経度）
      originalBbox[1] - bufferHeight, // 南（最小緯度）
      originalBbox[2] + bufferWidth, // 東（最大経度）
      originalBbox[3] + bufferHeight, // 北（最大緯度）
    ]

    // 拡張されたbboxでfitBounds実行
    mapInstance.fitBounds(expandedBbox, {
      padding: 20, // 最小限のパディング
      duration: 1000, // アニメーション時間（ミリ秒）
    })
  } catch (error) {
    handleError(
      createGeospatialError('Map bounds calculation failed', error as Error, {
        operation: 'fitToPolygon',
        feature: feature,
        originalBbox: turfBbox(feature.geometry),
      }),
    )
  }
}

const fitToAllView = () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  const bbox = turfBbox(persistStore.featurecollection) as [number, number, number, number]

  mapInstance.fitBounds(bbox, {
    padding: 20,
    duration: 1000,
  })
}

// 現在位置の緯度経度が変更された時の処理
watch(
  () => store.currentGeolocation,
  () => {
    getCurrentLocationFertilizerAmount()
  },
)

// マップの背景地図切り替え時の処理
watch(
  () => store.mapStyleIndex,
  () => {
    const mapInstance = map?.value
    if (!mapInstance) return

    mapInstance.once('idle', () => {
      addSource(mapInstance, persistStore.featurecollection)
      addLayer(mapInstance)

      if (activeVfmIndex.value !== null && currentVfm.value) {
        addVraMap(mapInstance, currentVfm.value)
      }
    })
  },
)

// 削除ボタン押下時の処理
watch(isDeleteVfm, () => {
  if (isDeleteVfm.value && activeVfmIndex.value !== null) {
    persistStore.featurecollection.features
      .find((feature) => feature.properties.id === activeFeatureId.value)
      ?.properties.vfms.splice(activeVfmIndex.value, 1)

    isDeleteVfm.value = false

    const vfmsLength = persistStore.featurecollection.features.find(
      (feature) => feature.properties.id === activeFeatureId.value,
    )?.properties.vfms.length

    if (vfmsLength !== 0) {
      previousStep()
      activeVfmIndex.value = null
    } else {
      reset()
    }
  }
  if (map?.value) {
    removeVraMap(map?.value)
  }
})

const runRealtimeVfm = () => {
  if (!store.isTracking) {
    store.geolocateControl?.trigger()
  }
  setTimeout(() => {
    showRealtimeVfm.value = true
  }, 300)
}

const stopRealtimeVfm = () => {
  if (store.isTracking) {
    store.geolocateControl?.trigger()
  }
  showRealtimeVfm.value = false
}

function validateStep1() {
  const vfmsLength = persistStore.featurecollection.features.find(
    (feature) => feature.properties.id === activeFeatureId.value,
  )?.properties.vfms.length

  if (vfmsLength === 0) {
    store.setMessage('Error', 'ポリゴンにVFマップが登録されていません')
    return false
  }
  if (activeFeatureId.value === null) {
    store.setMessage('Error', 'ポリゴンが選択されていません')
    return false
  }
  return true
}

// 戻る際の遷移処理
function onBackwardToStep1() {
  activeVfmIndex.value = null
  if (map?.value) removeVraMap(map?.value)
}

function onClearSelection() {
  activeFeatureId.value = null
  fitToAllView()
}

function onExecuteAction() {
  if (selectedAction.value === 'exportVfm') {
    exportVfm()
  } else if (selectedAction.value === 'runRealtimeVfm') {
    runRealtimeVfm()
  } else if (selectedAction.value === 'deleteVfm') {
    isOpenVfmDeleteDialog.value = true
  }
}
const selectedDialog = (selected: boolean) => {
  isOpenVfmDeleteDialog.value = false
  isDeleteVfm.value = selected
}
</script>

<template>
  <main class="fixed top-16 h-[calc(100dvh-4rem)] w-screen lg:flex">
    <!-- sidebar -->
    <div
      :class="[
        isDesktop
          ? 'relative p-8 h-full bg-slate-100 w-90 shrink-0'
          : 'absolute p-2 m-2 w-[calc(100%-1rem)] bg-slate-100/80 rounded-md',
        'block z-20',
      ]"
    >
      <div v-show="isDesktop" class="mt-2 mb-6">
        <h2 class="text-lg font-bold text-gray-800 text-center">可変施肥マップ表示・出力</h2>
      </div>

      <div v-if="!showRealtimeVfm">
        <div class="text-center text-rose-600 my-3">{{ message }}</div>
        <div
          v-if="showStep1"
          :class="[
            isDesktop ? 'max-h-[calc(100vh-18rem)]' : 'max-h-44 sm:max-h-64',
            'overflow-y-auto',
          ]"
        >
          <table class="w-full text-center table-fixed">
            <thead class="sticky top-0 bg-gray-50 z-10">
              <tr class="text-xs font-medium text-gray-500">
                <th class="px-3 py-2 w-1/4">ポリゴン<br />面積</th>
                <th class="px-3 py-2 w-1/4">作成<br />マップ数</th>
                <th class="px-3 py-2 w-1/2">ポリゴン<br />メモ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="(feature, index) in persistStore.featurecollection.features"
                :key="index"
                :class="[
                  activeFeatureId === feature.properties.id
                    ? 'bg-amber-50'
                    : 'cursor-pointer transition-colors duration-200 bg-white',
                ]"
                @click="fitToPolygon(feature)"
                title="クリックして地図上の位置を表示"
              >
                <td class="px-3 py-2">
                  <div class="flex items-center justify-center">
                    {{ feature.properties.area_are }} a
                  </div>
                </td>
                <td class="px-3 py-2">
                  <div
                    :class="[
                      isDesktop ? 'flex-col space-y-1' : 'flex-row space-x-1 justify-center',
                      'flex items-center',
                    ]"
                  >
                    {{ feature.properties.vfms.length }}
                  </div>
                </td>
                <td class="px-3 py-2">{{ feature.properties.memo }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="showStep2">
          <div
            v-for="feature in persistStore.featurecollection.features"
            :key="feature.properties.id"
          >
            <div
              v-if="feature.properties.id === activeFeatureId"
              :class="[
                isDesktop ? 'max-h-[calc(100vh-18rem)]' : 'max-h-44 sm:max-h-64',
                'overflow-y-auto',
              ]"
            >
              <table class="w-full text-center table-fixed">
                <thead class="sticky top-0 bg-gray-50 z-10">
                  <tr class="text-xs font-medium text-gray-500">
                    <th class="px-3 py-2 w-1/4 lg:w-1/3">10aあたり<br />施肥量</th>
                    <th class="px-3 py-2 w-1/4 lg:w-1/3">総施肥量</th>
                    <th class="px-3 py-2 w-1/2 lg:w-1/3">VFマップ<br />メモ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="(vfm, index) in feature.properties.vfms"
                    :key="vfm.id"
                    :class="[
                      activeVfmIndex === index
                        ? 'bg-amber-50'
                        : 'cursor-pointer transition-colors duration-200 bg-white',
                    ]"
                    @click="addVfm(vfm.vfm, index)"
                  >
                    <td class="px-3 py-2">{{ vfm.amount_10a }} kg</td>
                    <td class="px-3 py-2">{{ vfm.total_amount }} kg</td>
                    <td class="px-3 py-2">{{ vfm.memo }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="showStep3">
          <div>
            <select
              class="w-full p-3 rounded-md bg-white ring-1 ring-inset ring-gray-300 text-center"
              v-model="selectedAction"
            >
              <option value="exportVfm">マップ出力</option>
              <option value="runRealtimeVfm">現在位置の施肥量表示</option>
              <option class="bg-red-600" value="deleteVfm">削除</option>
            </select>
          </div>
        </div>

        <!-- ボタンの共通化 -->
        <StepNavigationButtons
          :buttonConfig="buttonConfig"
          :nextStep="nextStep"
          :previousStep="previousStep"
        />
      </div>

      <!-- リアルタイム施肥量表示タブのコンテンツ -->
      <div v-else>
        <RealtimeFertilizationDisplay
          :currentFertilizerAmount="currentFertilizerAmount"
          :currentGridInfo="currentGridInfo"
          @stopRealtimeVfm="stopRealtimeVfm"
        />
      </div>
    </div>

    <MapBase />

    <Dialog
      message="本当に削除しますか？"
      v-model:isOpen="isOpenVfmDeleteDialog"
      @selected="selectedDialog"
    />
  </main>
</template>
