<script setup lang="ts">
import { ref } from 'vue'
import shp from 'shpjs'
import { CloudArrowUpIcon } from '@heroicons/vue/24/outline'

import { usePolygonFeature } from '../composables/usePolygonFeature'
import { useErrorHandler, createValidationError } from '@/errors'

import { useStoreHandler } from '@/stores/indexedDbStoreHandler'
import { useStore } from '@/stores/store'

import type { Feature, FeatureCollection } from 'geojson'

const isOpenDialog = defineModel('isOpenDialog')
const fieldPolygonFeatureCollection = defineModel<FeatureCollection>(
  'fieldPolygonFeatureCollection',
)

const store = useStore()

const { handleError } = useErrorHandler()
const { maxFields, createField, allFieldsCount, readAllFields } = useStoreHandler()
const { createFieldFromPolygon } = usePolygonFeature()

const isUploading = ref(false)
const uploadProgress = ref('')
const selectedFile = ref<File | null>(null)

// ファイル選択ハンドラー
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

// ファイルアップロード処理
const handleUpload = async () => {
  // ポリゴン登録上限
  const maxFeatures = maxFields

  if (!selectedFile.value) {
    store.setMessage('Error', 'ファイルを選択してください')
    return
  }

  isUploading.value = true
  uploadProgress.value = 'ファイルを読み込んでいます...'

  try {
    // ZIPファイルをArrayBufferとして読み込む
    const buffer = await selectedFile.value.arrayBuffer()

    uploadProgress.value = 'シェープファイルを解析しています...'

    // shpjsでGeoJSONに変換（ZIPファイルとして処理）
    const geojson = await shp(buffer)

    // GeoJSONがFeatureCollectionでない場合の処理
    const featureCollection =
      geojson.type === 'FeatureCollection'
        ? geojson
        : { type: 'FeatureCollection', features: [geojson] }

    // ポリゴンのみを抽出
    const polygonFeatures = featureCollection.features.filter(
      (feature: Feature) =>
        feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon',
    )

    if (polygonFeatures.length === 0) {
      throw new Error('ポリゴンデータが含まれていません')
    }

    uploadProgress.value = `${polygonFeatures.length}個のポリゴンを登録しています...`

    // 登録済みポリゴン数

    const count = await allFieldsCount()

    // // 登録可能なポリゴン数
    let remainingFeaturesLength = maxFeatures - count
    // 各ポリゴンをindexedDbに追加
    let addedCount = 0

    for (const feature of polygonFeatures) {
      if (addedCount > 10 || remainingFeaturesLength <= 0) {
        break
      }
      // IDとnameを設定
      feature.properties = feature.properties || {}
      const memoBlank = ''

      const field = createFieldFromPolygon(feature, memoBlank)
      await createField(field)

      addedCount++
      remainingFeaturesLength--
    }
    fieldPolygonFeatureCollection.value = await readAllFields()

    if (addedCount > 0) {
      store.setMessage(
        'Info',
        `全${polygonFeatures.length}個のうち${addedCount}個の圃場を登録しました`,
      )
    } else {
      store.setMessage('Error', `ポリゴン登録上限（${maxFeatures}筆）に達してます`)
      return
    }

    closeDialog()
  } catch (error) {
    const appError = createValidationError(
      'shapefile',
      selectedFile.value?.name || 'unknown',
      error instanceof Error ? error.message : 'シェープファイルの読み込みに失敗しました',
    )
    handleError(appError)
  } finally {
    isUploading.value = false
    uploadProgress.value = ''
  }
}

const closeDialog = () => {
  isOpenDialog.value = false
  selectedFile.value = null
  uploadProgress.value = ''
}
</script>

<template>
  <div v-show="isOpenDialog" class="fixed top-0 left-0 w-screen h-screen bg-black/50 z-50">
    <div class="flex h-full items-center justify-center">
      <!-- ダイアログ本体 -->
      <div class="relative w-[600px] bg-white rounded-md p-6">
        <!-- 見出し -->
        <div class="mt-2 mb-6 text-center text-lg font-semibold">
          SHP（シェープファイル）からの圃場登録
        </div>

        <!-- アップロードエリア -->
        <div class="mb-6">
          <label
            for="shp-upload"
            class="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
              <CloudArrowUpIcon class="w-12 h-12 mb-3 text-gray-400" />
              <p class="mb-2 text-sm text-gray-500">
                <span class="font-semibold">クリックしてZIPファイルを選択</span>
              </p>
              <p class="text-xs text-gray-500">
                シェープファイルを圧縮したZIPファイルを選択してください
              </p>
            </div>
            <input
              id="shp-upload"
              type="file"
              class="hidden"
              accept=".zip,.json,.geojson"
              @change="handleFileSelect"
            />
          </label>
        </div>

        <!-- 選択されたファイル -->
        <div v-if="selectedFile" class="mb-4">
          <p class="text-sm font-medium text-gray-700 mb-2">選択されたファイル:</p>
          <p class="text-sm text-gray-600">{{ selectedFile.name }}</p>
        </div>

        <!-- 進捗表示 -->
        <div v-if="uploadProgress" class="mb-4">
          <p class="text-sm text-blue-600">{{ uploadProgress }}</p>
        </div>

        <!-- ボタン -->
        <div class="flex justify-center gap-4">
          <button
            @click="handleUpload"
            :disabled="isUploading || !selectedFile"
            class="h-12 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-md font-medium transition-colors"
          >
            {{ isUploading ? '処理中...' : 'インポート' }}
          </button>
          <button
            @click="closeDialog"
            :disabled="isUploading"
            class="h-12 px-6 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 rounded-md font-medium transition-colors"
          >
            キャンセル
          </button>
        </div>

        <!-- 注意事項 -->
        <div class="mt-6 p-4 bg-amber-50 rounded-md">
          <p class="text-xs text-amber-800">
            ※
            シェープファイル（.shp、.shx、.dbf、.prj）をZIP形式で圧縮したファイルをアップロードしてください。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
