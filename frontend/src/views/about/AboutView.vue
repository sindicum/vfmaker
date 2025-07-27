<script setup lang="ts">
import { ref } from 'vue'
import SiteDevelopmentNoteComp from './SiteDevelopmentNoteComp.vue'
import SiteUsageNoteComp from './SiteUsageNoteComp.vue'
import InitializeDialog from './components/InitializeDialog.vue'
import { Cog8ToothIcon } from '@heroicons/vue/24/solid'
import { usePersistStore } from '@/stores/persistStore'
import { useConfigPersistStore } from '@/stores/configPersistStore'
import { useErrorStore } from '@/stores/errorStore'
import { useStore } from '@/stores/store'

const showResetDialog = ref(false)
const persistStore = usePersistStore()
const configPersistStore = useConfigPersistStore()
const errorStore = useErrorStore()
const store = useStore()

const handleResetConfirm = (confirmed: boolean) => {
  showResetDialog.value = false

  if (confirmed) {
    // ストアの初期化
    store.setMessage('', '')
    store.mapLoaded = false
    store.currentPage = 0
    store.mapStyleIndex = 0
    store.isLoading = false
    store.currentGeolocation = {
      lat: null,
      lng: null,
    }

    // ローカルストレージの初期化
    persistStore.clearFeatureCollection()
    persistStore.deleteVariableFertilizationMaps()
    persistStore.centerPosition = { lng: 142.5, lat: 43.5, zoom: 7 }

    // 設定の初期化
    configPersistStore.outsideMeshClip = true
    configPersistStore.fiveStepsFertilization = true
    configPersistStore.humusSymbolIsVisible = false

    // エラーストアの初期化
    errorStore.clearErrors()

    // LocalStorage全削除（念のため）
    localStorage.clear()

    // 成功メッセージ表示
    store.setMessage('Info', 'アプリケーションを初期化しました。')

    // 1秒後にページをリロード（完全なリセットのため）
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }
}
</script>

<template>
  <main class="h-[calc(100vh-4rem)] w-screen mt-16 relative">
    <!-- 歯車アイコンを右上に配置 -->
    <button
      @click="showResetDialog = true"
      class="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      title="アプリケーションを初期化"
    >
      <Cog8ToothIcon class="w-6 h-6 text-gray-600" />
    </button>

    <!-- 既存のコンテンツ -->
    <div class="flex flex-col items-center justify-center">
      <SiteUsageNoteComp />
      <hr class="border-t-2 border-slate-200 w-full lg:w-5xl" />

      <SiteDevelopmentNoteComp />
    </div>

    <!-- 初期化確認ダイアログ -->
    <InitializeDialog
      :is-open="showResetDialog"
      message="すべてのデータを削除してアプリケーションを初期化しますか？この操作は取り消せません。"
      @selected="handleResetConfirm"
    />
  </main>
</template>
