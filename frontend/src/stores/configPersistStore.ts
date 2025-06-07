import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useConfigPersistStore = defineStore(
  'configPersistStore',
  () => {
    const outsideMeshClip = ref(false)
    const fiveStepsFertilization = ref(true)

    const outsideMeshClipChanged = () => {
      outsideMeshClip.value = !outsideMeshClip.value
    }

    const fiveStepsFertilizationChanged = () => {
      fiveStepsFertilization.value = !fiveStepsFertilization.value
    }
    return {
      outsideMeshClip,
      fiveStepsFertilization,
      outsideMeshClipChanged,
      fiveStepsFertilizationChanged,
    }
  },
  { persist: true },
)
