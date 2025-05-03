import { ref } from 'vue'
import type { DrawRef } from '@/types/maplibre'

export function useCreateLayerHandler(draw: DrawRef) {
  const isOpenDialog = ref(false)

  const drawOnFinish = () => {
    const drawInstance = draw?.value
    if (!drawInstance) return

    drawInstance.on('finish', openDialog)
  }

  const drawOffFinish = () => {
    const drawInstance = draw?.value
    if (!drawInstance) return

    drawInstance.off('finish', openDialog)
  }

  const openDialog = () => {
    isOpenDialog.value = true
  }

  return {
    isOpenDialog,
    drawOnFinish,
    drawOffFinish,
  }
}
