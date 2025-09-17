import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useConfigPersistStore = defineStore(
  'configPersistStore',
  () => {
    const outsideMeshClip = ref(true)
    const fiveStepsFertilization = ref(false)
    const humusSymbolIsVisible = ref(false)
    const missingHumusDataInterpolation = ref(true)
    const isNoticeVisible = ref(true)

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

    const noticeVisibleChanged = () => {
      isNoticeVisible.value = false
    }

    const reset = () => {
      outsideMeshClip.value = true
      fiveStepsFertilization.value = true
      humusSymbolIsVisible.value = false
      missingHumusDataInterpolation.value = true
      isNoticeVisible.value = true
    }

    return {
      outsideMeshClip,
      fiveStepsFertilization,
      humusSymbolIsVisible,
      missingHumusDataInterpolation,
      isNoticeVisible,
      outsideMeshClipChanged,
      fiveStepsFertilizationChanged,
      humusSymbolIsVisibleChanged,
      missingHumusDataInterpolationChanged,
      reset,
      noticeVisibleChanged,
    }
  },
  { persist: true },
)
