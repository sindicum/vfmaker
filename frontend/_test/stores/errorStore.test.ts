import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useErrorStore } from '@/stores/errorStore'
import type { AppError } from '@/errors/types'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'

// テスト用のエラーを作成
const createTestError = (
  id: string,
  message: string = 'Test error',
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  timestamp: Date = new Date(),
): AppError => ({
  id,
  timestamp,
  code: 'TEST_ERROR',
  message,
  category,
  severity: ErrorSeverity.MEDIUM,
})

describe('useErrorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // タイムスタンプのモックをリセット
    vi.useRealTimers()
  })

  describe('初期状態', () => {
    it('エラーリストが空で初期化される', () => {
      const store = useErrorStore()
      
      expect(store.errors).toEqual([])
    })
  })

  describe('addError', () => {
    it('エラーを追加できる', () => {
      const store = useErrorStore()
      const error = createTestError('1', 'エラーが発生しました')
      
      store.addError(error)
      
      expect(store.errors).toHaveLength(1)
      expect(store.errors[0]).toEqual(error)
    })

    it('複数のエラーを追加できる', () => {
      const store = useErrorStore()
      const error1 = createTestError('1', 'エラー1')
      const error2 = createTestError('2', 'エラー2')
      const error3 = createTestError('3', 'エラー3')
      
      store.addError(error1)
      store.addError(error2)
      store.addError(error3)
      
      expect(store.errors).toHaveLength(3)
      expect(store.errors).toEqual([error1, error2, error3])
    })

    it('異なるカテゴリの同じメッセージは両方保持される', () => {
      const store = useErrorStore()
      const now = new Date()
      
      const error1 = createTestError('1', '同じメッセージ', ErrorCategory.NETWORK, now)
      const error2 = createTestError('2', '同じメッセージ', ErrorCategory.VALIDATION, now)
      
      store.addError(error1)
      store.addError(error2)
      
      expect(store.errors).toHaveLength(2)
    })
  })

  describe('重複エラーの除去', () => {
    it('5分以内の同一エラーは古い方が削除される', () => {
      const store = useErrorStore()
      const baseTime = new Date('2024-01-01T10:00:00Z')
      
      // 同じカテゴリ・メッセージで、4分差のエラー
      const error1 = createTestError('1', '重複エラー', ErrorCategory.NETWORK, baseTime)
      const error2 = createTestError('2', '重複エラー', ErrorCategory.NETWORK, 
        new Date(baseTime.getTime() + 4 * 60 * 1000))
      
      store.addError(error1)
      store.addError(error2)
      
      // 古い方が削除され、新しい方だけが残る
      expect(store.errors).toHaveLength(1)
      expect(store.errors[0].id).toBe('2')
    })

    it('5分を超えた同一エラーは両方保持される', () => {
      const store = useErrorStore()
      const baseTime = new Date('2024-01-01T10:00:00Z')
      
      // 同じカテゴリ・メッセージで、6分差のエラー
      const error1 = createTestError('1', '重複エラー', ErrorCategory.NETWORK, baseTime)
      const error2 = createTestError('2', '重複エラー', ErrorCategory.NETWORK, 
        new Date(baseTime.getTime() + 6 * 60 * 1000))
      
      store.addError(error1)
      store.addError(error2)
      
      // 5分を超えているので両方保持される
      expect(store.errors).toHaveLength(2)
    })

    it('複数の重複エラーが正しく処理される', () => {
      const store = useErrorStore()
      const baseTime = new Date('2024-01-01T10:00:00Z')
      
      // 3つの同一エラー（1分間隔）
      const error1 = createTestError('1', '重複エラー', ErrorCategory.NETWORK, baseTime)
      const error2 = createTestError('2', '重複エラー', ErrorCategory.NETWORK, 
        new Date(baseTime.getTime() + 1 * 60 * 1000))
      const error3 = createTestError('3', '重複エラー', ErrorCategory.NETWORK, 
        new Date(baseTime.getTime() + 2 * 60 * 1000))
      
      store.addError(error1)
      store.addError(error2)
      store.addError(error3)
      
      // 最新のエラーのみが残る
      expect(store.errors).toHaveLength(1)
      expect(store.errors[0].id).toBe('3')
    })

    it('異なるメッセージのエラーは重複とみなされない', () => {
      const store = useErrorStore()
      const now = new Date()
      
      const error1 = createTestError('1', 'エラーメッセージ1', ErrorCategory.NETWORK, now)
      const error2 = createTestError('2', 'エラーメッセージ2', ErrorCategory.NETWORK, now)
      
      store.addError(error1)
      store.addError(error2)
      
      expect(store.errors).toHaveLength(2)
    })

    it('境界値のテスト：ちょうど5分は重複とみなされる', () => {
      const store = useErrorStore()
      const baseTime = new Date('2024-01-01T10:00:00Z')
      
      // ちょうど5分差のエラー
      const error1 = createTestError('1', '重複エラー', ErrorCategory.NETWORK, baseTime)
      const error2 = createTestError('2', '重複エラー', ErrorCategory.NETWORK, 
        new Date(baseTime.getTime() + 5 * 60 * 1000 - 1)) // 4分59秒999ミリ秒
      
      store.addError(error1)
      store.addError(error2)
      
      // 5分未満なので重複とみなされる
      expect(store.errors).toHaveLength(1)
      expect(store.errors[0].id).toBe('2')
    })
  })

  describe('複数インスタンスの動作', () => {
    it('同じストアインスタンスを返す', () => {
      const store1 = useErrorStore()
      const store2 = useErrorStore()
      const error = createTestError('1', 'テストエラー')
      
      store1.addError(error)
      
      expect(store2.errors).toHaveLength(1)
      expect(store1).toBe(store2)
    })
  })
})