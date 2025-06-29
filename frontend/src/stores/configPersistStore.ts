import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useConfigPersistStore = defineStore(
  'configPersistStore',
  () => {
    const outsideMeshClip = ref(true)
    const fiveStepsFertilization = ref(true)
    const humusSymbolIsVisible = ref(false)

    const outsideMeshClipChanged = () => {
      outsideMeshClip.value = !outsideMeshClip.value
    }

    const fiveStepsFertilizationChanged = () => {
      fiveStepsFertilization.value = !fiveStepsFertilization.value
    }

    const humusSymbolIsVisibleChanged = () => {
      humusSymbolIsVisible.value = !humusSymbolIsVisible.value
    }

    return {
      outsideMeshClip,
      fiveStepsFertilization,
      humusSymbolIsVisible,
      outsideMeshClipChanged,
      fiveStepsFertilizationChanged,
      humusSymbolIsVisibleChanged,
    }
  },
  { persist: true },
)
