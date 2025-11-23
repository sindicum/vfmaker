/**
 * 開発環境用ロガー
 * 本番環境ではログ出力を抑制し、開発環境でのみ詳細なログを出力
 */

const isDevelopment = import.meta.env.MODE === 'development'

export const logger = {
  /**
   * デバッグログ出力
   * 開発環境でのみ出力される
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * 情報ログ出力
   * 開発環境でのみ出力される
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * 警告ログ出力
   * すべての環境で出力される
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * エラーログ出力
   * すべての環境で出力される
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },
}
