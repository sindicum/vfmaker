<script setup lang="ts">
import { shallowRef, provide } from 'vue'
import { RouterView } from 'vue-router'

import Header from '@/components/header/HeaderComp.vue'
import Alert from '@/components/AlertComp.vue'

import type { MaplibreMap } from '@/types/maplibre'

// MaplibreMapオブジェクトを下位コンポーネントに注入（DI）する
const map = shallowRef<MaplibreMap>(null)

provide('mapkey', map)
</script>

<template>
  <Header />
  <Alert />
  <RouterView />
</template>
