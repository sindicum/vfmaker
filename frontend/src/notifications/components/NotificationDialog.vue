<script setup lang="ts">
import { ref } from 'vue'

const isShowDialog = ref(false)

const retry = () => {}
const toHome = () => {}
</script>

<template>
  <div v-show="isShowDialog" class="fixed top-0 left-0 w-screen h-screen bg-black/30 z-50">
    <div class="flex items-center justify-center h-full">
      <div class="bg-slate-100 w-80 h-44 rounded-md">
        <div class="text-center pt-8 pb-4"></div>
        <div class="flex justify-between px-8 py-6">
          <button
            class="h-12 w-28 bg-white hover:bg-slate-50 border border-slate-800 rounded-md"
            @click="toHome()"
          >
            ホームに戻る
          </button>
          <button class="h-12 w-28 bg-amber-300 hover:bg-amber-400 rounded-md" @click="retry()">
            再試行
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
