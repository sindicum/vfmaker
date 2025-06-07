<script setup lang="ts">
import { shallowRef, provide } from 'vue'
import { RouterView } from 'vue-router'
import { useStore } from '@/stores/store'

import Header from '@/components/header/HeaderComp.vue'
import Alert from '@/components/AlertComp.vue'
import LoadingComp from '@/components/LoadingComp.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

import type { MaplibreMap } from '@/types/maplibre'

// MaplibreMapオブジェクトを下位コンポーネントに注入（DI）する
const map = shallowRef<MaplibreMap>(null)
provide('mapkey', map)

const store = useStore()
</script>

<template>
  <ErrorBoundary>
    <Header />
    <RouterView />
    <Alert />
    <LoadingComp v-if="store.isLoading" />
  </ErrorBoundary>
</template>
