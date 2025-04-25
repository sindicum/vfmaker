<script setup lang="ts">
import StepStatusHeader from './components/StepStatusHeader.vue'

const step1Status = defineModel('step1Status')
</script>

<template>
  <StepStatusHeader id="1" name="圃場の選択" v-model:current-step-status="step1Status" />

  <div
    :class="[
      step1Status === 'current'
        ? 'max-h-96 transition-all duration-500 overflow-auto'
        : 'max-h-0 transition-all duration-500 overflow-hidden',
      'px-5',
    ]"
  >
    <div class="text-rose-600 my-4">地図から圃場を選択</div>
  </div>
</template>
