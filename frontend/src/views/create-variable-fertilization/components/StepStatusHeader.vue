<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/solid'

const id = defineModel('id')
const name = defineModel('name')
const currentStepStatus = defineModel('currentStepStatus')
</script>

<template>
  <div class="p-2">
    <span class="flex items-center">
      <span
        v-if="currentStepStatus === 'complete'"
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800"
      >
        <CheckIcon class="h-4 w-4 text-white" />
      </span>
      <span
        v-else
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-indigo-600"
      >
        {{ id }}
      </span>
      <span :class="[currentStepStatus !== 'current' ? 'text-gray-400' : 'font-medium', 'mx-4']">
        {{ name }}
      </span>
    </span>
  </div>
</template>
