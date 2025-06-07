<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/solid'

const id = defineModel('id')
const name = defineModel('name')
const currentStepStatus = defineModel('currentStepStatus')
</script>

<template>
  <div class="p-1 lg:p-2">
    <span class="flex items-center">
      <span
        v-if="currentStepStatus === 'complete'"
        class="flex lg:h-8 lg:w-8 h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800"
      >
        <CheckIcon class="h-4 w-4 text-white" />
      </span>
      <span
        v-else
        class="flex lg:h-8 lg:w-8 h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-indigo-600"
      >
        {{ id }}
      </span>
      <span
        :class="[currentStepStatus !== 'current' ? 'text-gray-400' : 'font-medium', 'ml-1 lg:ml-4']"
      >
        {{ name }}
      </span>
    </span>
  </div>
</template>
