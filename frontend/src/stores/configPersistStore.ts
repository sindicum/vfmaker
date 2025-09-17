import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useConfigPersistStore = defineStore(
  'configPersistStore',
  () => {
    const outsideMeshClip = ref(true)
    const fiveStepsFertilization = ref(false)
    const humusSymbolIsVisible = ref(false)
    const missingHumusDataInterpolation = ref(true)

    const outsideMeshClipChanged = () => {
      outsideMeshClip.value = !outsideMeshClip.value
    }

    const fiveStepsFertilizationChanged = () => {
      fiveStepsFertilization.value = !fiveStepsFertilization.value
    }

    const humusSymbolIsVisibleChanged = () => {
      humusSymbolIsVisible.value = !humusSymbolIsVisible.value
    }

    const missingHumusDataInterpolationChanged = () => {
      missingHumusDataInterpolation.value = !missingHumusDataInterpolation.value
    }

    const reset = () => {
      outsideMeshClip.value = true
      fiveStepsFertilization.value = true
      humusSymbolIsVisible.value = false
      missingHumusDataInterpolation.value = true
    }

    return {
      outsideMeshClip,
      fiveStepsFertilization,
      humusSymbolIsVisible,
      missingHumusDataInterpolation,
      outsideMeshClipChanged,
      fiveStepsFertilizationChanged,
      humusSymbolIsVisibleChanged,
      missingHumusDataInterpolationChanged,
      reset,
    }
  },
  { persist: true },
)
