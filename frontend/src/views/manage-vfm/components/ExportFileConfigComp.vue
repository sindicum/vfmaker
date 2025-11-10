<script setup lang="ts">
import { useConfigPersistStore } from '@/stores/configPersistStore'

const configPersistStore = useConfigPersistStore()
const isOpenConfig = defineModel('isOpenConfig')
const closeDialog = () => {
  isOpenConfig.value = false
}
</script>

<template>
  <div v-show="isOpenConfig" class="fixed top-0 left-0 w-screen h-screen bg-black/50 z-50">
    <div class="flex h-full items-center justify-center">
      <!-- ダイアログ本体 -->
      <div class="relative w-80 bg-white rounded-md p-5">
        <!-- 見出し -->
        <div class="mt-2 mb-4 text-center font-semibold">出力するファイルの種類</div>

        <!-- メッシュの外周処理-->
        <div class="my-6">
          <div class="flex flex-col gap-2 ml-2">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.exportFileType === 'shp'"
                @change="configPersistStore.changeExportFileType('shp')"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>シェープファイル</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.exportFileType === 'iso-xml'"
                @change="configPersistStore.changeExportFileType('iso-xml')"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>ISO-XMLファイル</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.exportFileType === 'geotiff'"
                @change="configPersistStore.changeExportFileType('geotiff')"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>GeoTIFFファイル</span>
            </label>
          </div>
        </div>

        <!-- 閉じるボタン -->
        <div class="flex justify-center">
          <button @click="closeDialog" class="h-12 w-28 bg-amber-300 hover:bg-amber-400 rounded-md">
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
