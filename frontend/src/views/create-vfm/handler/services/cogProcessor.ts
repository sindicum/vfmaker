import { fromUrl, Pool } from 'geotiff'
import { useErrorHandler, createGeospatialError } from '@/errors'

import type { ReadRasterResult } from 'geotiff'

/**
 * COGソースからラスターデータを取得（リトライ機能付き）
 * @param url COGファイルのURL
 * @param bbox3857 EPSG:3857のバウンディングボックス
 * @returns ラスターデータ
 */
async function extractCogSource(
  url: string,
  bbox3857: [number, number, number, number],
): Promise<ReadRasterResult> {
  const { handleError } = useErrorHandler()
  const pool = new Pool()

  try {
    const tiff = await fromUrl(url)
    const cogSource = await tiff.readRasters({
      bbox: bbox3857,
      samples: [0], // 取得するバンドを指定
      interleave: true,
      pool,
    })

    return cogSource
  } catch (error) {
    // エラーの詳細情報を収集
    const isError = error instanceof Error
    const errorDetails = {
      userAgent: navigator.userAgent,
      cogUrl: url,
      bbox: bbox3857,
      errorType: isError ? error.constructor.name : typeof error,
      errorMessage: isError ? error.message : String(error),
      aggregateErrors:
        isError && 'errors' in error && Array.isArray(error.errors)
          ? error.errors.map((e: Error) => ({
              type: e?.constructor?.name || 'Unknown',
              message: e?.message || 'No message',
              stack: e?.stack || 'No stack trace',
            }))
          : undefined,
      timestamp: new Date().toISOString(),
    }

    // エラーハンドラーを使用してユーザーに通知
    const appError = createGeospatialError(
      `COGデータ読み込み: ${isError ? error.message : String(error)}`,
      isError ? error : new Error(String(error)),
      errorDetails,
    )
    handleError(appError)

    // リトライ（Poolなしで再試行）
    try {
      const tiff = await fromUrl(url)
      const cogSource = await tiff.readRasters({
        bbox: bbox3857,
        samples: [0],
        interleave: true,
        // poolを指定しない
      })
      return cogSource
    } catch (retryError) {
      // リトライも失敗した場合
      const isRetryError = retryError instanceof Error
      const retryAppError = createGeospatialError(
        `COGデータ読み込み再試行失敗: ${isRetryError ? retryError.message : String(retryError)}`,
        isRetryError ? retryError : new Error(String(retryError)),
        { ...errorDetails, retry: true },
      )
      handleError(retryAppError)
      throw retryError
    }
  } finally {
    // 最終的にPoolを破棄
    if (pool && 'destroy' in pool && typeof pool.destroy === 'function') {
      pool.destroy()
    }
  }
}

/**
 * COGから腐植値データを取得
 * @param url COGファイルのURL
 * @param bbox3857 EPSG:3857のバウンディングボックス
 * @returns ラスターデータ
 */
export async function extractCogHumusValues(
  url: string,
  bbox3857: [number, number, number, number],
): Promise<ReadRasterResult> {
  return await extractCogSource(url, bbox3857)
}
