/**
 * 循環参照を安全に処理するJSONシリアライズユーティリティ
 */

interface SafeJsonOptions {
  maxDepth?: number
  replacer?: (key: string, value: unknown) => unknown
}

/**
 * 循環参照を安全に処理するJSON.stringify
 */
export function safeJsonStringify(
  obj: unknown,
  options: SafeJsonOptions = {}
): string {
  const { maxDepth = 10, replacer } = options
  const seen = new WeakSet()
  let depth = 0

  const safeReplacer = (key: string, value: unknown): unknown => {
    // 最大深度チェック
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]'
    }

    // プリミティブ値はそのまま返す
    if (value === null || typeof value !== 'object') {
      return replacer ? replacer(key, value) : value
    }

    // 循環参照チェック
    if (seen.has(value as object)) {
      return '[Circular]'
    }

    seen.add(value as object)

    try {
      depth++

      // 特定のオブジェクトタイプの処理
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack?.slice(0, 1000),
        }
      }

      if (value instanceof Date) {
        return value.toISOString()
      }

      if (value instanceof Map) {
        return Object.fromEntries(Array.from(value.entries()).slice(0, 50))
      }

      if (value instanceof Set) {
        return Array.from(value).slice(0, 50)
      }

      // HTMLElementや DOM要素の処理
      if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
        return {
          tagName: value.tagName,
          id: value.id,
          className: value.className,
        }
      }

      // 関数の処理
      if (typeof value === 'function') {
        return '[Function]'
      }

      // MapLibre GL関連オブジェクトの処理
      if (value && typeof value === 'object') {
        const constructor = (value as Record<string, unknown>).constructor as { name?: string }
        if (constructor && constructor.name) {
          // MapLibre GLのMapオブジェクトやその他の複雑なオブジェクト
          if (constructor.name.includes('Map') ||
              constructor.name.includes('Source') ||
              constructor.name.includes('Layer')) {
            return `[${constructor.name}]`
          }
        }
      }

      // 通常のオブジェクトや配列の処理
      const result = replacer ? replacer(key, value) : value
      depth--
      return result

    } catch {
      depth--
      return '[Serialization Error]'
    }
  }

  try {
    return JSON.stringify(obj, safeReplacer, 2)
  } catch (error) {
    console.warn('Safe JSON stringify failed:', error)
    return JSON.stringify({
      error: 'Serialization failed',
      type: typeof obj,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * 循環参照を安全に処理してオブジェクトをクリーンアップ
 */
export function safeCloneObject<T>(
  obj: T,
  options: SafeJsonOptions = {}
): T {
  try {
    const jsonString = safeJsonStringify(obj, options)
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('Safe clone failed:', error)
    return {} as T
  }
}

/**
 * エラーコンテキスト用の安全なシリアライザー
 */
export function safeSerializeContext(context: Record<string, unknown>): Record<string, unknown> {
  const safeContext: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    try {
      // プリミティブ値はそのまま
      if (value === null || typeof value !== 'object') {
        safeContext[key] = value
        continue
      }

      // 配列の処理（最初の10要素のみ）
      if (Array.isArray(value)) {
        safeContext[key] = value.slice(0, 10).map(item =>
          typeof item === 'object' ? '[Object]' : item
        )
        continue
      }

      // オブジェクトの処理
      if (typeof value === 'object') {
        const constructor = (value as Record<string, unknown>).constructor as { name?: string }
        if (constructor && constructor.name) {
          // 既知の複雑なオブジェクトは文字列化
          if (constructor.name.includes('Map') ||
              constructor.name.includes('Source') ||
              constructor.name.includes('Layer') ||
              constructor.name.includes('Event')) {
            safeContext[key] = `[${constructor.name}]`
            continue
          }
        }

        // 通常のオブジェクトは浅いコピー
        const simpleObj: Record<string, unknown> = {}
        let count = 0
        for (const [objKey, objValue] of Object.entries(value as Record<string, unknown>)) {
          if (count >= 5) break // 最大5プロパティ
          if (typeof objValue !== 'object') {
            simpleObj[objKey] = objValue
          } else {
            simpleObj[objKey] = '[Object]'
          }
          count++
        }
        safeContext[key] = simpleObj
      }
    } catch {
      safeContext[key] = '[Serialization Error]'
    }
  }

  return safeContext
}