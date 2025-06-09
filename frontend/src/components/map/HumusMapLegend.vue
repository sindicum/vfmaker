<script setup lang="ts">
const legendItems = [
  { value: '0', color: '#d7191c' },
  { value: '25', color: '#f07c4a' },
  { value: '50', color: '#fec980' },
  { value: '75', color: '#ffffbf' },
  { value: '100', color: '#c7e8ad' },
  { value: '125', color: '#80bfab' },
  { value: '150', color: '#2b83ba' },
]
</script>

<template>
  <div class="bg-white/90 p-3 rounded-lg shadow-md text-xs">
    <div class="font-semibold">腐植値凡例</div>
    <div class="font-semibold mb-2 text-center">(mg/kg)</div>
    <ul>
      <li v-for="item in legendItems" :key="item.value" class="flex items-center mb-0.5">
        <span class="w-4 h-4 rounded-sm border mr-2" :style="{ backgroundColor: item.color }" />
        <span>{{ item.value }}</span>
      </li>
    </ul>
  </div>
</template>
