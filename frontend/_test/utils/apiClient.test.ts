import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { apiClient } from '@/utils/apiClient'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'
import type { FeatureCollection } from 'geojson'

// useErrorHandlerのモック
const mockHandleError = vi.fn()
vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}))

// 環境変数のモック
vi.stubEnv('VITE_AWS_APIGATEWAY_KEY', 'test-api-key')

// fetchのモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('apiClient', () => {
  const testFeatureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [139.0, 35.0],
        },
        properties: {
          name: 'テストポイント',
        },
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // メモリ効率化のためのクリーンアップ - 未処理のPromiseを削除
    if (global.gc) global.gc()
  })

  describe('post', () => {
    it('正常なAPIレスポンスを処理する', async () => {
      const responseData = { success: true, id: 'test-id' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      })

      const result = await apiClient.post('https://api.example.com/test', testFeatureCollection)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
        body: JSON.stringify(testFeatureCollection),
      })
      expect(result).toEqual(responseData)
      expect(mockHandleError).not.toHaveBeenCalled()
    })

    it('HTTPエラーに対してリトライする', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }
      const successResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }

      // 最初の2回は失敗、3回目は成功
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse)

      const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)

      // タイマーを進めてリトライを実行
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: true })
      expect(mockHandleError).not.toHaveBeenCalled()
    })

    it('最大リトライ回数に達した場合はエラーをハンドリングする', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }

      mockFetch.mockResolvedValue(errorResponse)

      // メモリ効率化のため非同期エラーハンドリングを適切に処理
      const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)
        .catch(err => err) // エラーをキャッチして返す

      // タイマーを進めてリトライを実行
      await vi.runAllTimersAsync()

      const result = await resultPromise
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('HTTP 500: Internal Server Error')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          message: 'ネットワークエラー: api_request_failed',
          userMessage: 'サーバーとの通信に失敗しました。しばらく待ってから再試行してください。',
          context: {
            operation: 'api_request_failed',
            url: 'https://api.example.com/test',
            attempt: 3,
            maxRetries: 3,
          },
        }),
      )
    })

    it('ネットワークエラーに対してリトライする', async () => {
      const networkError = new Error('Network error')
      const successResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }

      // 最初の2回はネットワークエラー、3回目は成功
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse)

      const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)

      // タイマーを進めてリトライを実行
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: true })
      expect(mockHandleError).not.toHaveBeenCalled()
    })

    it('指数バックオフでリトライ間隔が増加する', async () => {
      const error = new Error('Network error')
      
      mockFetch.mockRejectedValue(error)

      // メモリ効率化のため非同期エラーハンドリングを適切に処理
      const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)
        .catch(err => err) // エラーをキャッチして返す

      // 最初のリクエスト
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // 1回目のリトライ（2秒後）
      await vi.advanceTimersByTimeAsync(2000)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // 2回目のリトライ（4秒後）
      await vi.advanceTimersByTimeAsync(4000)
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // エラー処理を待機
      const result = await resultPromise
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Network error')
    })

    it('JSONパースエラーを適切にハンドリングする', async () => {
      const parseError = new Error('Invalid JSON')
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(parseError),
      })

      // メモリ効率化のため非同期エラーハンドリングを適切に処理
      const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)
        .catch(err => err) // エラーをキャッチして返す

      // タイマーを進めてリトライを実行
      await vi.runAllTimersAsync()

      const result = await resultPromise
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Invalid JSON')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          originalError: parseError,
        }),
      )
    })

    it('正しいヘッダーとボディでリクエストを送信する', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      await apiClient.post('https://api.example.com/endpoint', testFeatureCollection)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
        body: JSON.stringify(testFeatureCollection),
      })
    })

    it('異なるHTTPステータスコードを適切にハンドリングする', async () => {
      const testCases = [
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 403, statusText: 'Forbidden' },
        { status: 404, statusText: 'Not Found' },
        { status: 429, statusText: 'Too Many Requests' },
        { status: 502, statusText: 'Bad Gateway' },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        
        mockFetch.mockResolvedValue({
          ok: false,
          status: testCase.status,
          statusText: testCase.statusText,
        })

        // メモリ効率化のため非同期エラーハンドリングを適切に処理
        const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)
          .catch(err => err) // エラーをキャッチして返す

        await vi.runAllTimersAsync()

        const result = await resultPromise
        expect(result).toBeInstanceOf(Error)
        expect(result.message).toBe(`HTTP ${testCase.status}: ${testCase.statusText}`)
      }
    })
  })

  describe('エラー生成', () => {
    it('エラーオブジェクトに一意のIDが生成される', async () => {
      mockFetch.mockRejectedValue(new Error('Test error'))

      // メモリ効率化のため非同期エラーハンドリングを適切に処理
      const resultPromise1 = apiClient.post('https://api.example.com/test', testFeatureCollection)
        .catch(err => err) // エラーをキャッチして返す
      const resultPromise2 = apiClient.post('https://api.example.com/test', testFeatureCollection)
        .catch(err => err) // エラーをキャッチして返す

      await vi.runAllTimersAsync()

      const result1 = await resultPromise1
      const result2 = await resultPromise2
      
      expect(result1).toBeInstanceOf(Error)
      expect(result2).toBeInstanceOf(Error)

      const calls = mockHandleError.mock.calls
      expect(calls).toHaveLength(2)

      const errorId1 = calls[0][0].id
      const errorId2 = calls[1][0].id

      expect(errorId1).toMatch(/^api_error_\d+_[a-z0-9]+$/)
      expect(errorId2).toMatch(/^api_error_\d+_[a-z0-9]+$/)
      expect(errorId1).not.toBe(errorId2)
    })

    it('エラーにタイムスタンプが含まれる', async () => {
      const testDate = new Date('2024-01-01T00:00:00Z')
      vi.setSystemTime(testDate)

      mockFetch.mockRejectedValue(new Error('Test error'))

      // メモリ効率化のため非同期エラーハンドリングを適切に処理
      const resultPromise = apiClient.post('https://api.example.com/test', testFeatureCollection)
        .catch(err => err) // エラーをキャッチして返す

      await vi.runAllTimersAsync()

      const result = await resultPromise
      expect(result).toBeInstanceOf(Error)

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      )

      // タイムスタンプがテスト開始時刻から10秒以内であることを確認
      const errorCall = mockHandleError.mock.calls[mockHandleError.mock.calls.length - 1]
      const actualTimestamp = errorCall[0].timestamp
      const timeDiff = Math.abs(actualTimestamp.getTime() - testDate.getTime())
      expect(timeDiff).toBeLessThanOrEqual(10000) // 10秒以内
    })
  })
})