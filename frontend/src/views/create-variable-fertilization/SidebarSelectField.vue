<script setup lang="ts">
import StepStatusHeader from './components/StepStatusHeader.vue'
import { useControlScreenWidth } from '@/components/useControlScreenWidth'
const step1Status = defineModel('step1Status')
const { isDesktop } = useControlScreenWidth()
</script>

<template>
  <div v-if="isDesktop || step1Status === 'current'" class="grid-cols-1 grid items-center">
    <StepStatusHeader id="1" name="圃場の選択" v-model:current-step-status="step1Status" />

    <div
      :class="[
        step1Status === 'current' ? 'max-h-96  overflow-auto' : 'max-h-0  overflow-hidden',
        'px-5 transition-all duration-500',
      ]"
    >
      <div class="text-rose-600 my-4">地図から圃場を選択</div>
    </div>
  </div>
</template>
