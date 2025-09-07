<script setup lang="ts">
import type { ButtonConfig } from '@/views/manage-vfm/manage-fieldpolygon.types'
const props = defineProps<{
  buttonConfig: ButtonConfig
  nextStep: () => void
  previousStep: () => void
}>()
</script>

<template>
  <div
    v-if="buttonConfig"
    class="grid grid-cols-2 gap-3 col-span-2 lg:col-span-1 justify-center mt-4 mb-2"
  >
    <button
      :class="[
        props.buttonConfig.backDisabled ? 'bg-slate-200 text-slate-500' : 'bg-white',
        'p-2 rounded-md  ring-1 ring-inset ring-gray-300',
      ]"
      @click="props.previousStep"
      title="Left Button"
      :disabled="props.buttonConfig.backDisabled ?? false"
    >
      {{ props.buttonConfig.backLabel }}
    </button>
    <button
      :class="[
        props.buttonConfig.forwardDisabled
          ? 'bg-slate-200 text-slate-500'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white',
        'p-2 rounded-md   ring-1 ring-inset ring-gray-300',
      ]"
      @click="props.nextStep"
      title="Right Button"
      :disabled="props.buttonConfig.forwardDisabled ?? false"
    >
      {{ props.buttonConfig.forwardLabel }}
    </button>
  </div>
</template>
