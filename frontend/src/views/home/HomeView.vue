<script setup lang="ts">
import { onMounted, watch, inject } from 'vue'

import MapBase from '@/components/map/MapBase.vue'
import { useHumusCog } from '@/components/useHumusCog'
import { useStore } from '@/stores/store'

import type { ShallowRef } from 'vue'
import type { MaplibreMap } from '@/types/maplibre'

const map = inject<ShallowRef<MaplibreMap | null>>('mapkey')
const { addCog } = useHumusCog(map)

const store = useStore()

onMounted(() => {
  if (map?.value) {
    map.value.on('load', async () => {
      await addCog()
    })
  }
})

watch(
  () => store.mapStyleIndex,
  () => {
    if (map?.value) {
      map.value.once('idle', async () => {
        await addCog()
      })
    }
  },
)
</script>

<template>
  <main class="h-[calc(100vh-4rem)] w-screen">
    <MapBase />
  </main>
</template>
