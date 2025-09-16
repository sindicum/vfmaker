import { ref, readonly, computed } from 'vue'

export interface StepNavigationCallbacks {
  // バリデーション（進む時のみ実行）
  validateStep1?: () => boolean
  validateStep2?: () => boolean
  validateStep3?: () => boolean

  // 各ステップへの遷移時の処理（方向別）
  onForwardToStep1?: () => void
  onForwardToStep2?: () => void
  onForwardToStep3?: () => void
  onBackwardToStep1?: () => void
  onBackwardToStep2?: () => void
  onBackwardToStep3?: () => void

  // アクション
  onClearSelection?: () => void
  onExecuteAction?: () => void
}

export const useStepNavigation = (callbacks: StepNavigationCallbacks = {}) => {
  const currentStep = ref(1)
  const activeFeatureUuid = ref<string | null>(null)
  const activeVfmIndex = ref<number | null>(null)

  const buttonConfig = computed(() => {
    switch (currentStep.value) {
      case 1:
        return {
          backLabel: '選択クリア',
          forwardLabel: '進む',
          backDisabled: activeFeatureUuid.value === null,
          forwardDisabled: activeFeatureUuid.value === null,
        }
      case 2:
        return {
          backLabel: '戻る',
          forwardLabel: '進む',
          backDisabled: false,
          forwardDisabled: activeVfmIndex.value === null,
        }
      case 3:
        return {
          backLabel: '戻る',
          forwardLabel: '実行',
          backDisabled: false,
          forwardDisabled: false,
        }
      default:
        return {
          backLabel: '戻る',
          forwardLabel: '進む',
          backDisabled: true,
          forwardDisabled: true,
        }
    }
  })

  // 進むの可否判定
  const canGoForward = computed(() => {
    if (currentStep.value === 1) return activeFeatureUuid.value !== null
    if (currentStep.value === 2) return activeVfmIndex.value !== null
    return true
  })

  // 戻るの可否判定
  const canGoBack = computed(() => currentStep.value > 1)

  // ステップ遷移のコア処理
  const goToStep = (targetStep: number, direction: 'forward' | 'backward' = 'forward') => {
    const isForward = direction === 'forward'

    // バリデーション（進む場合のみ）
    if (isForward) {
      const validateCallback = callbacks[
        `validateStep${currentStep.value}` as keyof StepNavigationCallbacks
      ] as (() => boolean) | undefined
      if (validateCallback) {
        const isValid = validateCallback()
        if (!isValid) {
          return
        }
      }
    }

    // ステップ変更
    currentStep.value = targetStep

    // 新しいステップへの遷移処理（方向別）
    const callbackDirection = isForward ? 'Forward' : 'Backward'
    const callback = callbacks[
      `on${callbackDirection}ToStep${targetStep}` as keyof StepNavigationCallbacks
    ] as (() => void) | undefined
    callback?.()
  }

  // 進むの処理
  const nextStep = () => {
    if (currentStep.value === 3) {
      // Step3での「進む」は実行処理
      executeAction()
      return
    }
    goToStep(currentStep.value + 1, 'forward')
  }

  // 戻るの処理
  const previousStep = () => {
    if (currentStep.value === 1) {
      // Step1での「戻る」は選択クリア
      clearSelection()
      return
    }
    goToStep(currentStep.value - 1, 'backward')
  }

  // 選択クリアの処理
  const clearSelection = () => {
    if (callbacks.onClearSelection) {
      callbacks.onClearSelection()
    }
  }

  // 実行の処理
  const executeAction = () => {
    if (callbacks.onExecuteAction) {
      callbacks.onExecuteAction()
    }
  }

  // 初期状態に戻る
  const reset = () => {
    currentStep.value = 1
    activeFeatureUuid.value = null
    activeVfmIndex.value = null
  }

  return {
    // State
    buttonConfig,
    currentStep: readonly(currentStep),
    activeFeatureUuid,
    activeVfmIndex,

    // Computed
    canGoBack,
    canGoForward,

    // Actions
    nextStep,
    previousStep,
    goToStep,
    clearSelection,
    executeAction,
    reset,
  }
}
