import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useErrorHandler } from './useErrorHandler'
import { useStore } from '@/stores/store'
import { useErrorStore } from '@/stores/errorStore'
import { ErrorCategory, ErrorSeverity } from '@/types/error'
import type { AppError } from '@/types/error'

describe('useErrorHandler', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const createMockError = (overrides: Partial<AppError> = {}): AppError => ({
    id: 'test-error-id',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'Test error message',
    userMessage: 'テストエラーが発生しました',
    timestamp: new Date(),
    ...overrides,
  })

  it('should handle error and add to error store', () => {
    const { handleError } = useErrorHandler()
    const errorStore = useErrorStore()
    const mockError = createMockError()

    handleError(mockError)

    expect(errorStore.errors).toHaveLength(1)
    expect(errorStore.errors[0]).toEqual(mockError)
  })

  it('should show user message for medium severity error', () => {
    const { handleError } = useErrorHandler()
    const store = useStore()
    const mockError = createMockError({ severity: ErrorSeverity.MEDIUM })

    handleError(mockError)

    expect(store.alertMessage.alertType).toBe('Info')
    expect(store.alertMessage.message).toBe('テストエラーが発生しました')
  })

  it('should show error alert for high severity error', () => {
    const { handleError } = useErrorHandler()
    const store = useStore()
    const mockError = createMockError({ severity: ErrorSeverity.HIGH })

    handleError(mockError)

    expect(store.alertMessage.alertType).toBe('Error')
    expect(store.alertMessage.message).toBe('テストエラーが発生しました')
  })

  it('should show error alert for critical severity error', () => {
    const { handleError } = useErrorHandler()
    const store = useStore()
    const mockError = createMockError({ severity: ErrorSeverity.CRITICAL })

    handleError(mockError)

    expect(store.alertMessage.alertType).toBe('Error')
    expect(store.alertMessage.message).toBe('テストエラーが発生しました')
  })

  it('should not show user message for low severity error', () => {
    const { handleError } = useErrorHandler()
    const store = useStore()
    const mockError = createMockError({ severity: ErrorSeverity.LOW })

    handleError(mockError)

    expect(store.alertMessage.alertType).toBe('')
    expect(store.alertMessage.message).toBe('')
  })

  it('should log console error for all errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { handleError } = useErrorHandler()
    const mockError = createMockError({
      context: { operation: 'test-operation' },
    })

    handleError(mockError)

    expect(consoleSpy).toHaveBeenCalledWith(
      '[network] Test error message',
      { operation: 'test-operation' }
    )

    consoleSpy.mockRestore()
  })

  it('should log additional warning for network errors', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { handleError } = useErrorHandler()
    const mockError = createMockError({ category: ErrorCategory.NETWORK })

    handleError(mockError)

    expect(consoleSpy).toHaveBeenCalledWith(
      'ネットワークエラーが発生しました。接続を確認してください。'
    )

    consoleSpy.mockRestore()
  })

  it('should not log network warning for non-network errors', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { handleError } = useErrorHandler()
    const mockError = createMockError({ category: ErrorCategory.VALIDATION })

    handleError(mockError)

    expect(consoleSpy).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})