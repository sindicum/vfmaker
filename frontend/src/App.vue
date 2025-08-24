<script setup lang="ts">
import { shallowRef, provide } from 'vue'
import { RouterView } from 'vue-router'
import { useStore } from '@/stores/store'

import Header from '@/components/header/Header.vue'
import Alert from '@/components/common/components/Alert.vue'
import Loading from '@/components/common/components/Loading.vue'
import ErrorBoundary from '@/components/common/components/ErrorBoundary.vue'

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
    <Loading v-if="store.isLoading" />
  </ErrorBoundary>
</template>
