import { Pool } from 'geotiff'

// シングルトンパターンでPoolインスタンスを管理
let sharedPool: Pool | null = null

/**
 * 共有されたGeoTIFF Poolインスタンスを取得
 * iOS Chromeなどのモバイルブラウザでの同時WebWorker制限に対応
 */
export function getSharedPool(): Pool {
  if (!sharedPool) {
    sharedPool = new Pool()
  }
  return sharedPool
}

/**
 * Poolインスタンスをリセット（エラー時のリカバリー用）
 */
export function resetPool(): void {
  if (sharedPool) {
    // 既存のPoolをクリーンアップ
    try {
      // Poolにdestroy()メソッドがある場合は呼び出す
      if ('destroy' in sharedPool && typeof sharedPool.destroy === 'function') {
        sharedPool.destroy()
      }
    } catch (e) {
      console.error('GeoTIFF Poolエラーが発生しました。')
    }
    sharedPool = null
  }
}
