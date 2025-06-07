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
      <div class="relative w-72 bg-white rounded-md p-5">
        <!-- 見出し -->
        <div class="mt-2 mb-4 text-center font-semibold">可変施肥マップ作成の設定</div>

        <!-- メッシュの外周処理-->
        <div class="my-6">
          <div class="text-rose-600 mb-1">メッシュの外周処理</div>
          <div class="border-b border-gray-300 mb-2"></div>
          <div class="flex flex-col gap-2 ml-2">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.outsideMeshClip === false"
                @change="configPersistStore.outsideMeshClipChanged"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>処理を行わない</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.outsideMeshClip === true"
                @change="configPersistStore.outsideMeshClipChanged"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>圃場ポリゴン形状で切り抜く</span>
            </label>
          </div>
        </div>

        <!-- 可変施肥量の段階 -->
        <div class="my-6">
          <div class="text-rose-600 mb-1">施肥量の可変段階</div>
          <div class="border-b border-gray-300 mb-2"></div>
          <div class="flex flex-col gap-2 ml-2">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.fiveStepsFertilization === true"
                @change="configPersistStore.fiveStepsFertilizationChanged"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>5段階</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                :checked="configPersistStore.fiveStepsFertilization === false"
                @change="configPersistStore.fiveStepsFertilizationChanged"
                class="w-4 h-4 accent-indigo-600"
              />
              <span>無段階</span>
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
