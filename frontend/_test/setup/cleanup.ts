/**
 * メモリ効率化のためのテスト用クリーンアップ機能
 * 大きなオブジェクトやメモリリークを防ぐためのユーティリティ
 */

/**
 * メモリ効率化のための重いオブジェクトクリーンアップ
 * テスト終了後に大量のメモリを使用するオブジェクトを明示的に削除
 */
export function cleanupHeavyObjects(): void {
  // メモリ効率化のためガベージコレクションを強制実行
  if (global.gc) {
    global.gc()
  }
  
  // メモリ効率化のためDOM要素のクリア
  if (typeof document !== 'undefined') {
    const testElements = document.querySelectorAll('[data-testid]')
    testElements.forEach(element => element.remove())
  }
}

/**
 * メモリ効率化のためのMapオブジェクト削除
 * 大量のMapデータを含むオブジェクトをクリア
 */
export function clearMapObjects(...maps: Map<any, any>[]): void {
  maps.forEach(map => {
    if (map instanceof Map) {
      map.clear()
    }
  })
}

/**
 * メモリ効率化のための配列オブジェクト削除
 * 大量の配列データをクリア
 */
export function clearArrayObjects(...arrays: any[][]): void {
  arrays.forEach(array => {
    if (Array.isArray(array)) {
      array.length = 0
    }
  })
}

/**
 * メモリ効率化のためのImageData/バイナリデータ削除
 * 重いイメージデータやバイナリデータをクリア
 */
export function clearImageData(...imageData: (ImageData | Uint8Array | Uint8ClampedArray)[]): void {
  imageData.forEach(data => {
    if (data && typeof data === 'object') {
      // ImageDataの場合
      if ('data' in data && data.data instanceof Uint8ClampedArray) {
        data.data.fill(0)
      }
      // TypedArrayの場合
      else if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
        data.fill(0)
      }
    }
  })
}

/**
 * メモリ効率化のための統合クリーンアップ関数
 * 全ての重いオブジェクトを一括でクリーンアップ
 */
export function cleanupAllHeavyResources(
  maps?: Map<any, any>[],
  arrays?: any[][],
  imageData?: (ImageData | Uint8Array | Uint8ClampedArray)[]
): void {
  if (maps) clearMapObjects(...maps)
  if (arrays) clearArrayObjects(...arrays)
  if (imageData) clearImageData(...imageData)
  cleanupHeavyObjects()
}