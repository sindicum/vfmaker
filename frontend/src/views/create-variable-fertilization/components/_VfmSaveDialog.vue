<script setup lang="ts">
const isOpenVfmSaveDialog = defineModel('isOpenVfmSaveDialog')
const isOverwriteSave = defineModel('isOverwriteSave')
const closeDialog = () => {
  isOpenVfmSaveDialog.value = false
  isOverwriteSave.value = false
}

const overwriteSave = () => {
  isOpenVfmSaveDialog.value = false
  isOverwriteSave.value = true
}
</script>

<template>
  <div v-show="isOpenVfmSaveDialog" class="fixed top-0 left-0 w-screen h-screen bg-black/50 z-50">
    <div class="flex h-full items-center justify-center">
      <!-- ダイアログ本体 -->
      <div class="relative w-72 bg-white rounded-md p-5">
        <!-- 見出し -->
        <div class="mt-2 mb-4 text-center font-semibold">同一IDのマップが存在します</div>

        <!-- 閉じるボタン -->
        <div class="grid grid-cols-2 gap-4 justify-center mx-3 mt-5 mb-3">
          <button
            class="border w-full h-12 bg-slate-50 hover:bg-slate-100 rounded-md"
            @click="closeDialog"
          >
            戻る
          </button>
          <button
            class="border w-full h-12 bg-amber-300 hover:bg-amber-400 rounded-md"
            @click="overwriteSave"
          >
            上書き保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
