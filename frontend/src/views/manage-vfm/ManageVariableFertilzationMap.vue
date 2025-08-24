<script setup lang="ts">
import { onMounted, onUnmounted, inject, ref, watch, computed, type ShallowRef } from 'vue'
import MapBase from '@/components/map/MapBase.vue'
import { usePersistStore } from '@/stores/persistStore'
import type { MaplibreMap } from '@/types/maplibre'
import { useStore } from '@/stores/store'
import type { FeatureCollection, Feature, Polygon } from 'geojson'
import {
  bbox as turfBbox,
  booleanPointInPolygon as turfBooleanPointInPolygon,
  point as turfPoint,
  buffer as turfBuffer,
} from '@turf/turf'
import Dialog from '@/components/common/components/Dialog.vue'
import {
  addSource,
  addLayer,
  addVraMap,
  removeVraMap,
} from '../create-variable-fertilization/handler/LayerHandler'
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'
import type { VariableFertilizationMap } from '@/stores/persistStore'
import {
  useErrorHandler,
  createGeneralError,
  createNetworkError,
  createHttpError,
  createGeospatialError,
} from '@/errors'

const { isDesktop } = useControlScreenWidth()
const map = inject<ShallowRef<MaplibreMap | null>>('mapkey')
const persistStore = usePersistStore()
const store = useStore()

// タブの状態管理を追加
const activeTab = ref<'realtime' | 'management'>('management')

// ヘルプダイアログの状態管理
const isHelpDialogOpen = ref(false)
// 全削除ダイアログの状態管理
const isOpenDeleteAllDialog = ref<boolean>(false)

const { handleError } = useErrorHandler()

// 総施肥量と面積の合計を計算
const totalFertilizerAmount = computed(() => {
  return persistStore.variableFertilizationMaps.reduce((sum, vfm) => {
    return sum + (vfm.totalAmount || 0)
  }, 0)
})

const totalArea = computed(() => {
  return persistStore.variableFertilizationMaps.reduce((sum, vfm) => {
    return sum + (vfm.area || 0)
  }, 0)
})

// 現在位置の状態管理
const currentGridInfo = ref<{
  fertilizerAmount: number
  vfmId: string
} | null>(null)

// 現在位置がVFMグリッド内にあるかチェック
const checkCurrentPositionInGrid = () => {
  try {
    // ポリゴンが登録されていない場合は何もしない
    if (persistStore.featurecollection.features.length === 0) {
      return
    }

    // 現在位置のバリデーション
    const lat = store.currentGeolocation.lat
    const lng = store.currentGeolocation.lng

    if (!lat || !lng) {
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`)
    }

    let currentFeatureId = null
    const currentPoint = turfPoint([lng, lat])

    // ポリゴンが登録されている場合はポリゴン内にあるかチェック
    // パフォーマンス最適化: バッファ計算を事前に行い、早期終了を実装
    for (const feature of persistStore.featurecollection.features) {
      try {
        const extendedFeature = turfBuffer(feature as Feature<Polygon>, 0.03, {
          units: 'kilometers',
        })

        if (!extendedFeature || !feature.properties) continue

        const isInside = turfBooleanPointInPolygon(currentPoint, extendedFeature)
        if (isInside) {
          currentFeatureId = feature.properties.id
          break
        }
      } catch (featureError) {
        // 個別のfeature処理エラーはログのみ
        handleError(
          createGeospatialError(
            'Feature processing error in position check',
            featureError as Error,
            {
              featureId: feature.properties?.id,
              operation: 'checkCurrentPositionInGrid',
            },
          ),
          {
            showUserNotification: false,
            logToConsole: true,
          },
        )
        continue
      }
    }

    // 現在位置がポリゴン内に無ければ何もしない
    if (!currentFeatureId) {
      currentGridInfo.value = null
      return
    }

    // 現在位置がポリゴン内にあれば、ポリゴンidに紐づくVFMを探す
    const vfm = persistStore.variableFertilizationMaps.find((v) => v.id === currentFeatureId)
    if (!vfm) {
      currentGridInfo.value = null
      return
    }

    // 現在位置に対応するVFMの施肥量を設定
    // パフォーマンス最適化: ポリゴンのみを対象とし、早期終了を実装
    for (const feature of vfm.featureCollection.features) {
      // ポリゴン以外はスキップ
      if (feature.geometry.type !== 'Polygon' || !feature.properties) {
        continue
      }

      try {
        const isInside = turfBooleanPointInPolygon(currentPoint, feature as Feature<Polygon>)
        if (isInside) {
          currentGridInfo.value = {
            fertilizerAmount: feature.properties.amount_fertilization_unit,
            vfmId: vfm.id,
          }
          return
        }
      } catch (gridError) {
        // グリッド処理エラーをログに記録し処理を継続
        handleError(
          createGeospatialError(
            'Grid processing error in fertilizer amount check',
            gridError as Error,
            {
              vfmId: vfm.id,
              featureGeometry: feature.geometry.type,
              operation: 'checkCurrentPositionInGrid',
            },
          ),
          {
            showUserNotification: false,
            logToConsole: true,
          },
        )
        continue
      }
    }

    // グリッド内に見つからない場合はnullを設定
    currentGridInfo.value = null
  } catch (error) {
    handleError(
      createGeospatialError('Current position grid check failed', error as Error, {
        currentGeolocation: store.currentGeolocation,
        featureCollectionSize: persistStore.featurecollection.features.length,
        vfmCount: persistStore.variableFertilizationMaps.length,
      }),
      {
        showUserNotification: false, // 頻繁に実行される処理のため通知なし
        logToConsole: true,
      },
    )
    currentGridInfo.value = null
  }
}

const resetCurrentGridInfo = () => {
  if (store.currentGeolocation.lat === null && store.currentGeolocation.lng === null) {
    currentGridInfo.value = null
  }
}

const handleMapLoad = () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  addSource(mapInstance, persistStore.featurecollection)
  addLayer(mapInstance)

  persistStore.variableFertilizationMaps.forEach((v) => {
    const vfm = v.featureCollection
    const id = v.id
    addVraMap(mapInstance, vfm, id)
  })
}

onMounted(() => {
  const mapInstance = map?.value
  if (!mapInstance) return

  mapInstance.on('load', handleMapLoad)
})

onUnmounted(() => {
  const mapInstance = map?.value
  if (mapInstance) {
    mapInstance.off('load', handleMapLoad)
  }
})

watch(
  () => store.currentGeolocation,
  () => {
    resetCurrentGridInfo()
    checkCurrentPositionInGrid()
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

      persistStore.variableFertilizationMaps.forEach((v) => {
        const vfm = v.featureCollection
        const id = v.id
        addVraMap(mapInstance, vfm, id)
      })
    })
  },
)

const deleteAllVfm = () => {
  const mapInstance = map?.value
  if (!mapInstance) return

  const vfmLength = persistStore.variableFertilizationMaps.length

  if (vfmLength === 0) {
    store.setMessage('Error', '可変施肥マップがありません')
    return
  }

  isOpenDeleteAllDialog.value = true
}

const removeVfm = (id: string) => {
  const mapInstance = map?.value
  if (!mapInstance) {
    handleError(
      createGeneralError(
        'Map instance not available',
        '地図が初期化されていません。ページをリロードしてください。',
        undefined,
        new Error('Map instance is null'),
        { operation: 'removeVfm', vfmId: id },
      ),
    )
    return
  }

  try {
    removeVraMap(mapInstance, id)
    persistStore.removeVariableFertilizationMap(id)
    store.setMessage('Info', '可変施肥マップを削除しました')
  } catch (error) {
    handleError(
      createGeneralError(
        'VFM removal failed',
        '可変施肥マップの削除に失敗しました。地図の状態を確認してください。',
        undefined,
        error as Error,
        {
          operation: 'removeVfm',
          vfmId: id,
          mapInstance: !!mapInstance,
        },
      ),
    )
  }
}

const exportVfm = async (vfm: FeatureCollection) => {
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
      // ✅ 適切なHTTPエラーハンドリング
      handleError(
        createHttpError(res.status, url, 'POST', new Error(`HTTP ${res.status}: ${res.statusText}`), {
          operation: 'vfm_export',
          statusText: res.statusText,
          featureCount: vfm.features.length,
        }),
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

const fitToVfm = (vfm: VariableFertilizationMap) => {
  const mapInstance = map?.value
  if (!mapInstance) {
    handleError(
      createGeneralError(
        'Map instance not available',
        '地図が初期化されていません。',
        undefined,
        new Error('Map instance is null'),
        { operation: 'fitToVfm', vfmId: vfm.id },
      ),
    )
    return
  }

  try {
    // FeatureCollectionからbboxを計算
    const originalBbox = turfBbox(vfm.featureCollection)

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
        operation: 'fitToVfm',
        vfmId: vfm.id,
        featureCount: vfm.featureCollection.features.length,
        originalBbox: turfBbox(vfm.featureCollection),
      }),
    )
  }
}

const selectedDeleteAllDialog = (selected: boolean) => {
  const mapInstance = map?.value
  if (!mapInstance) return

  if (selected) {
    persistStore.variableFertilizationMaps.forEach((vfm) => {
      // 表示されているマップを削除
      removeVraMap(mapInstance, vfm.id)
    })
    // ローカルストレージのデータを削除
    persistStore.deleteVariableFertilizationMaps()

    store.setMessage('Info', '可変施肥マップをすべて削除しました')
  }
  isOpenDeleteAllDialog.value = false
}
</script>

<template>
  <main class="fixed top-16 h-[calc(100dvh-4rem)] w-screen lg:flex">
    <!-- sidebar -->
    <div
      :class="[
        isDesktop
          ? 'relative p-8 h-full bg-slate-100 min-w-90'
          : 'absolute p-2 m-2 w-[calc(100%-1rem)] bg-slate-100/80 rounded-md',
        'block z-20',
      ]"
    >
      <div v-show="isDesktop" class="mt-2 mb-6">
        <h2 class="text-lg font-bold text-gray-800 text-center">可変施肥マップ表示・出力・管理</h2>
      </div>

      <!-- タブメニュー -->
      <div :class="[isDesktop ? 'mb-4' : 'mb-2']">
        <div class="border-b border-gray-200 flex col-span-4">
          <button
            :class="[
              activeTab === 'management' ? 'bg-gray-50 shadow-sm' : 'bg-gray-200 text-gray-400',
              'flex-1 py-2 px-3 text-xs sm:text-sm font-medium text-center border-2 border-transparent rounded-t-xl transition-all duration-200 ',
            ]"
            @click="activeTab = 'management'"
          >
            マップ出力・管理
          </button>
          <button
            :class="[
              activeTab === 'realtime' ? 'bg-gray-50 shadow-sm' : 'bg-gray-200 text-gray-400',
              'flex-1 py-2 px-3 text-sm font-medium text-center border-2 border-transparent rounded-t-xl transition-all duration-200',
            ]"
            @click="activeTab = 'realtime'"
          >
            <div :class="[isDesktop ? 'flex flex-col' : 'flex flex-row justify-center']">
              <div class="text-xs sm:text-sm">リアルタイム</div>
              <div class="text-xs sm:text-sm">施肥量表示</div>
            </div>
          </button>
        </div>
      </div>

      <!-- マップ出力・管理タブのコンテンツ -->
      <div v-show="activeTab === 'management'">
        <div class="">
          <!-- 合計値の表示 -->
          <div
            :class="[
              isDesktop ? 'flex-col mb-4 p-4' : 'flex-row items-center p-2 mb-1',
              'flex  bg-amber-50 rounded-lg border border-amber-200',
            ]"
          >
            <h3
              :class="[
                isDesktop ? 'flex-row' : 'flex-col sm:flex-row text-sm',
                'flex font-semibold text-amber-800 justify-center',
              ]"
            >
              <span class="text-center">施肥量・面積の</span>
              <span class="text-center">総合計</span>
            </h3>
            <div
              :class="[
                isDesktop ? 'mt-4' : 'sm:flex flex-row gap-x-6 mx-auto',
                'grid grid-cols-2 gap-2 text-sm items-center',
              ]"
            >
              <div class="text-gray-600 text-xs flex items-center justify-center">施肥量合計</div>
              <div class="font-bold text-xl text-amber-700 flex items-center justify-center">
                {{ totalFertilizerAmount.toFixed(0) }}<span class="mx-1">kg</span>
              </div>
              <div class="text-gray-600 text-xs flex items-center justify-center">面積合計</div>
              <div class="font-bold text-xl text-amber-700 flex items-center justify-center">
                {{ totalArea.toFixed(0) }}<span class="mx-1"></span>a
              </div>
            </div>
          </div>

          <!-- データがある場合のテーブル表示 -->
          <div
            v-if="persistStore.variableFertilizationMaps.length > 0"
            :class="[
              isDesktop ? 'max-h-[calc(100vh-30rem)]' : 'max-h-44 sm:max-h-64',
              'bg-white rounded-lg border border-gray-200  overflow-y-auto',
            ]"
          >
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    No.
                  </th>
                  <th
                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    施肥量
                  </th>
                  <th
                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    面積
                  </th>
                  <th
                    class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="(vfm, index) in persistStore.variableFertilizationMaps"
                  :key="vfm.id"
                  class="hover:bg-amber-50 cursor-pointer transition-colors duration-200"
                  @click="fitToVfm(vfm)"
                  title="クリックして地図上の位置を表示"
                >
                  <td class="px-3 py-2 whitespace-nowrap">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded-full border border-indigo-600 text-xs"
                    >
                      {{ index + 1 }}
                    </span>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {{ vfm.totalAmount }}<span class="mx-0.5">kg</span>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {{ vfm.area.toFixed(0) }}<span class="mx-0.5">a</span>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap text-center">
                    <div
                      :class="[
                        isDesktop
                          ? 'flex flex-col space-y-1 items-center'
                          : 'flex flex-row space-x-1 items-center justify-center',
                      ]"
                    >
                      <!-- 出力ボタン -->
                      <button
                        class="flex items-center px-2 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
                        @click.stop="exportVfm(vfm.featureCollection)"
                        title="可変施肥マップを出力"
                      >
                        <svg
                          class="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          ></path>
                        </svg>
                        出力
                      </button>

                      <!-- 削除ボタン -->
                      <button
                        class="flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                        @click.stop="removeVfm(vfm.id)"
                        title="削除"
                      >
                        <svg
                          class="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          ></path>
                        </svg>
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- データがない場合の表示 -->
          <div v-else class="text-center py-8 text-gray-500">
            <svg
              class="mx-auto h-12 w-12 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            <p>保存された施肥マップがありません</p>
          </div>
        </div>

        <div v-show="isDesktop" class="mt-4 pt-4 border-t border-gray-300 flex justify-center">
          <button
            class="flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 h-8"
            @click="deleteAllVfm"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
            保存データの全削除
          </button>
        </div>
      </div>

      <!-- リアルタイム施肥量表示タブのコンテンツ -->
      <div v-show="activeTab === 'realtime'" class="space-y-4">
        <!-- 現在位置のグリッド情報 -->
        <div v-if="currentGridInfo" class="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 class="font-semibold text-amber-800 mb-3 text-center">現在位置の施肥量</h3>
          <div class="text-center">
            <div class="text-2xl font-bold text-amber-700 mb-1">
              {{ currentGridInfo.fertilizerAmount }}kg/10a
            </div>
          </div>
        </div>

        <!-- 位置情報が無効な場合の表示 -->
        <div
          v-else-if="store.currentGeolocation.lat === null && store.currentGeolocation.lng === null"
        >
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-center gap-2">
              <div class="text-center text-sm text-gray-600">現在位置が取得できません</div>
              <button
                @click="isHelpDialogOpen = true"
                class="h-5 w-12 rounded-md bg-amber-600 text-white text-xs hover:bg-amber-700 transition-colors duration-200 flex items-center justify-center"
                title="位置情報の取得方法について"
              >
                Help
              </button>
            </div>
          </div>
        </div>

        <!-- 現在位置がVFMエリア内にある場合の表示 -->
        <div
          v-else-if="
            store.currentGeolocation.lat !== null &&
            store.currentGeolocation.lng !== null &&
            currentGridInfo === null
          "
          class="p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div class="text-center text-sm text-gray-600">現在位置は登録されたVFMエリア外です</div>
        </div>
      </div>
    </div>

    <MapBase />

    <!-- ヘルプダイアログ -->
    <div v-show="isHelpDialogOpen" class="fixed top-0 left-0 w-screen h-screen bg-black/30 z-50">
      <div class="flex items-center justify-center h-full p-4">
        <div class="bg-white max-w-md w-full rounded-lg shadow-lg">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-800">位置情報の取得について</h3>
              <button
                @click="isHelpDialogOpen = false"
                class="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            <div class="text-sm text-gray-600 space-y-3">
              <ol class="list-decimal list-inside space-y-2 ml-2">
                <li>
                  地図上の位置情報ボタンを押す<br />
                  <div class="flex items-center gap-2 mt-1">
                    <div
                      class="flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded shadow-sm"
                    >
                      <svg class="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M12,2 C12.5128358,2 12.9355072,2.38604019 12.9932723,2.88337887 L13,3 L13.0003445,4.31396524 C16.4808766,4.76250386 19.238071,7.51999063 19.6861644,11.0006622 L21,11 C21.5522847,11 22,11.4477153 22,12 C22,12.5128358 21.6139598,12.9355072 21.1166211,12.9932723 L21,13 L19.6860348,13.0003445 C19.2375394,16.480541 16.480541,19.2375394 13.0003445,19.6860348 L13,21 C13,21.5522847 12.5522847,22 12,22 C11.4871642,22 11.0644928,21.6139598 11.0067277,21.1166211 L11,21 L11.0006622,19.6861644 C7.51999063,19.238071 4.76250386,16.4808766 4.31396524,13.0003445 L3,13 C2.44771525,13 2,12.5522847 2,12 C2,11.4871642 2.38604019,11.0644928 2.88337887,11.0067277 L3,11 L4.31383558,11.0006622 C4.7619722,7.51965508 7.51965508,4.7619722 11.0006622,4.31383558 L11,3 C11,2.44771525 11.4477153,2 12,2 Z M12,6.25 C8.82436269,6.25 6.25,8.82436269 6.25,12 C6.25,15.1756373 8.82436269,17.75 12,17.75 C15.1756373,17.75 17.75,15.1756373 17.75,12 C17.75,8.82436269 15.1756373,6.25 12,6.25 Z M12,8 C14.209139,8 16,9.790861 16,12 C16,14.209139 14.209139,16 12,16 C9.790861,16 8,14.209139 8,12 C8,9.790861 9.790861,8 12,8 Z"
                        />
                      </svg>
                    </div>
                    <span class="text-xs text-rose-600">
                      地図にあるこのボタンをクリックしてください
                    </span>
                  </div>
                </li>
                <li>ブラウザの位置情報アクセス許可を確認してください</li>
                <li>スマートフォンの場合、位置情報サービスが有効になっているか確認してください</li>
                <li>屋内にいる場合は、屋外に移動してお試しください</li>
                <li>
                  ブラウザを再読み込みして、位置情報の許可を再度求められた場合は「許可」を選択してください
                </li>
              </ol>
              <p class="text-xs text-gray-500 mt-4">
                ※ 位置情報は可変施肥マップの現在位置での施肥量を表示するために使用されます
              </p>
            </div>
            <div class="mt-6 flex justify-center">
              <button
                @click="isHelpDialogOpen = false"
                class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全削除を選択したときにダイアログを表示 -->
    <Dialog
      message="本当に削除しますか"
      :isOpen="isOpenDeleteAllDialog!"
      @selected="selectedDeleteAllDialog"
    />
  </main>
</template>
