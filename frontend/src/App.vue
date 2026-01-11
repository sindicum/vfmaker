<script setup lang="ts">
import { shallowRef, provide } from 'vue'
import { RouterView } from 'vue-router'
import { useStore } from '@/stores/store'

import Header from '@/components/header/AppHeader.vue'
import Loading from '@/components/common/components/Loading.vue'
import { ErrorBoundary } from '@/errors'
import { Alert, NotificationDialog } from '@/notifications'

import type { MapLibreMap } from './types/map.type'

// MaplibreMapオブジェクトを下位コンポーネントに注入（DI）する
const map = shallowRef<MapLibreMap>(null)
provide('mapkey', map)

const store = useStore()
</script>

<template>
  <ErrorBoundary>
    <Header />
    <RouterView />
    <Alert />
    <NotificationDialog />
    <Loading v-if="store.isLoading" />
  </ErrorBoundary>
</template>
