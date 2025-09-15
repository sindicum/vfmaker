import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createGeospatialError } from '@/utils/errorFactories'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'

describe('errorFactories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createGeospatialError', () => {
    it('基本的なGeospatialエラーを生成する', () => {
      const operation = 'polygon_processing'
      const originalError = new Error('Invalid coordinates')
      
      const error = createGeospatialError(operation, originalError)

      expect(error).toMatchObject({
        category: ErrorCategory.GEOSPATIAL,
        severity: ErrorSeverity.MEDIUM,
        message: '空間データ処理エラー: polygon_processing',
        userMessage: '地図データの処理中にエラーが発生しました。再試行してください。',
        context: { operation: 'polygon_processing' },
        originalError,
      })
    })

    it('コンテキスト情報付きのエラーを生成する', () => {
      const operation = 'grid_generation'
      const originalError = new Error('Grid size too small')
      const context = {
        gridWidth: 10,
        gridHeight: 10,
        totalFeatures: 100,
      }

      const error = createGeospatialError(operation, originalError, context)

      expect(error.context).toEqual({
        operation: 'grid_generation',
        gridWidth: 10,
        gridHeight: 10,
        totalFeatures: 100,
      })
      expect(error.originalError).toBe(originalError)
    })

    it('一意のエラーIDを生成する', () => {
      const operation = 'test_operation'
      const originalError = new Error('Test error')

      const error1 = createGeospatialError(operation, originalError)
      const error2 = createGeospatialError(operation, originalError)

      expect(error1.id).toMatch(/^error_\d+_[a-z0-9]+$/)
      expect(error2.id).toMatch(/^error_\d+_[a-z0-9]+$/)
      expect(error1.id).not.toBe(error2.id)
    })

    it('現在のタイムスタンプを設定する', () => {
      const testDate = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(testDate)

      const operation = 'timestamp_test'
      const originalError = new Error('Test error')

      const error = createGeospatialError(operation, originalError)

      expect(error.timestamp).toEqual(testDate)
    })

    it('空のコンテキストでもエラーを生成する', () => {
      const operation = 'minimal_test'
      const originalError = new Error('Minimal error')

      const error = createGeospatialError(operation, originalError, {})

      expect(error.context).toEqual({ operation: 'minimal_test' })
    })

    it('複雑なコンテキストオブジェクトを処理する', () => {
      const operation = 'complex_operation'
      const originalError = new Error('Complex error')
      const context = {
        coordinates: [[139.0, 35.0], [139.1, 35.1]],
        metadata: {
          source: 'user_input',
          validated: true,
        },
        settings: {
          precision: 6,
          simplify: false,
        },
        count: 42,
      }

      const error = createGeospatialError(operation, originalError, context)

      expect(error.context).toEqual({
        operation: 'complex_operation',
        coordinates: [[139.0, 35.0], [139.1, 35.1]],
        metadata: {
          source: 'user_input',
          validated: true,
        },
        settings: {
          precision: 6,
          simplify: false,
        },
        count: 42,
      })
    })

    it('operationパラメータがメッセージに正しく含まれる', () => {
      const testCases = [
        'createVfm',
        'generateGrid',
        'processPolygon',
        'calculateHumus',
        'exportShapefile',
      ]

      testCases.forEach((operation) => {
        const originalError = new Error('Test error')
        const error = createGeospatialError(operation, originalError)

        expect(error.message).toBe(`空間データ処理エラー: ${operation}`)
        expect(error.context.operation).toBe(operation)
      })
    })

    it('異なるError型のoriginalErrorを処理する', () => {
      const operation = 'error_type_test'
      
      // 標準Error
      const standardError = new Error('Standard error')
      const error1 = createGeospatialError(operation, standardError)
      expect(error1.originalError).toBe(standardError)

      // TypeError
      const typeError = new TypeError('Type error')
      const error2 = createGeospatialError(operation, typeError)
      expect(error2.originalError).toBe(typeError)

      // RangeError
      const rangeError = new RangeError('Range error')
      const error3 = createGeospatialError(operation, rangeError)
      expect(error3.originalError).toBe(rangeError)
    })

    it('contextのoperationが重複した場合の動作', () => {
      const operation = 'original_operation'
      const originalError = new Error('Test error')
      const context = {
        operation: 'context_operation', // 意図的に重複
        additionalInfo: 'test',
      }

      const error = createGeospatialError(operation, originalError, context)

      // contextのoperationが優先される（...contextが後に展開されるため）
      expect(error.context.operation).toBe('context_operation')
      expect(error.context.additionalInfo).toBe('test')
    })

    it('undefinedまたはnullのcontextを処理する', () => {
      const operation = 'null_context_test'
      const originalError = new Error('Test error')

      const error1 = createGeospatialError(operation, originalError, undefined)
      expect(error1.context).toEqual({ operation: 'null_context_test' })

      const error2 = createGeospatialError(operation, originalError, null as any)
      expect(error2.context).toEqual({ operation: 'null_context_test' })
    })

    it('エラーオブジェクトの構造が正しい', () => {
      const operation = 'structure_test'
      const originalError = new Error('Structure test error')

      const error = createGeospatialError(operation, originalError)

      // 必須プロパティの存在確認
      expect(error).toHaveProperty('id')
      expect(error).toHaveProperty('category')
      expect(error).toHaveProperty('severity')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('userMessage')
      expect(error).toHaveProperty('timestamp')
      expect(error).toHaveProperty('context')
      expect(error).toHaveProperty('originalError')

      // 型の確認
      expect(typeof error.id).toBe('string')
      expect(typeof error.category).toBe('string')
      expect(typeof error.severity).toBe('string')
      expect(typeof error.message).toBe('string')
      expect(typeof error.userMessage).toBe('string')
      expect(error.timestamp).toBeInstanceOf(Date)
      expect(typeof error.context).toBe('object')
      expect(error.originalError).toBeInstanceOf(Error)
    })
  })
})