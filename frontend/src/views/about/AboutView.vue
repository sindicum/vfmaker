<script setup lang="ts">
import { ref } from 'vue'
import SiteDevelopmentNoteComp from './SiteDevelopmentNoteComp.vue'
import SiteUsageNoteComp from './SiteUsageNoteComp.vue'
import InitializeDialog from './components/InitializeDialog.vue'
import { Cog8ToothIcon } from '@heroicons/vue/24/solid'
import { useErrorStore } from '@/stores/errorStore'
import { useStore } from '@/stores/store'
import { useStoreHandler } from '@/stores/indexedDbStoreHandler'

const showResetDialog = ref(false)
const errorStore = useErrorStore()
const store = useStore()
const { deleteAllFields } = useStoreHandler()

const handleResetConfirm = (confirmed: boolean) => {
  showResetDialog.value = false

  if (confirmed) {
    // LocalStorage全削除
    localStorage.clear()
    // エラーストアの初期化
    errorStore.clearErrors()

    // indexedDBの全削除
    deleteAllFields()

    // 成功通知とリロード
    store.setMessage('Info', 'アプリケーションを初期化しました。')
    setTimeout(() => {
      window.location.reload()
    }, 500)
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
