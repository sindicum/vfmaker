import { ErrorCategory, ErrorSeverity } from './types'

// カテゴリ別のデフォルトメッセージ
export const DEFAULT_ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]: {
    [ErrorSeverity.LOW]: 'ネットワークの接続状態を確認してください',
    [ErrorSeverity.MEDIUM]: 'ネットワーク接続を確認してください',
    [ErrorSeverity.HIGH]: 'サーバーとの通信に失敗しました。しばらく待ってから再試行してください',
    [ErrorSeverity.CRITICAL]: 'ネットワークエラーによりシステムが利用できません',
  },
  [ErrorCategory.GEOSPATIAL]: {
    [ErrorSeverity.LOW]: '地図データの処理に時間がかかっています',
    [ErrorSeverity.MEDIUM]: '地図データの処理中にエラーが発生しました',
    [ErrorSeverity.HIGH]: '空間データの形式が正しくありません。データを確認してください',
    [ErrorSeverity.CRITICAL]: '地図データの読み込みに失敗しました',
  },
  [ErrorCategory.VALIDATION]: {
    [ErrorSeverity.LOW]: '入力内容を確認してください',
    [ErrorSeverity.MEDIUM]: '入力値が正しくありません',
    [ErrorSeverity.HIGH]: '必須項目が入力されていません',
    [ErrorSeverity.CRITICAL]: 'データの検証に失敗しました',
  },
  [ErrorCategory.PERMISSION]: {
    [ErrorSeverity.LOW]: '一部の機能が制限されています',
    [ErrorSeverity.MEDIUM]: 'この操作には権限が必要です',
    [ErrorSeverity.HIGH]: '権限がありません。管理者に連絡してください',
    [ErrorSeverity.CRITICAL]: 'アクセスが拒否されました',
  },
  [ErrorCategory.UNKNOWN]: {
    [ErrorSeverity.LOW]: '予期しない問題が発生しました',
    [ErrorSeverity.MEDIUM]: 'エラーが発生しました。再試行してください',
    [ErrorSeverity.HIGH]: 'システムエラーが発生しました',
    [ErrorSeverity.CRITICAL]: '致命的なエラーが発生しました。サポートに連絡してください',
  },
} as const

// 特定のエラー状況に対するカスタムメッセージ
export const SPECIFIC_ERROR_MESSAGES = {
  // ネットワーク関連
  NETWORK_OFFLINE: 'インターネット接続がオフラインです',
  NETWORK_TIMEOUT: 'リクエストがタイムアウトしました',
  NETWORK_CORS: 'クロスオリジンリクエストがブロックされました',
  
  // API関連
  API_UNAUTHORIZED: '認証が必要です。再度ログインしてください',
  API_FORBIDDEN: 'この操作を実行する権限がありません',
  API_NOT_FOUND: '要求されたリソースが見つかりません',
  API_RATE_LIMIT: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください',
  API_SERVER_ERROR: 'サーバーエラーが発生しました',
  
  // 地理空間データ関連
  GEO_INVALID_POLYGON: 'ポリゴンの形状が正しくありません',
  GEO_INVALID_COORDINATES: '座標値が無効です',
  GEO_GRID_GENERATION_FAILED: 'グリッドの生成に失敗しました',
  GEO_COG_LOAD_FAILED: 'COGタイルの読み込みに失敗しました',
  
  // バリデーション関連
  VALIDATION_REQUIRED: '必須項目です',
  VALIDATION_MIN_VALUE: '最小値を下回っています',
  VALIDATION_MAX_VALUE: '最大値を上回っています',
  VALIDATION_INVALID_FORMAT: '形式が正しくありません',
  
  // ファイル関連
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます',
  FILE_INVALID_TYPE: 'ファイル形式がサポートされていません',
  FILE_UPLOAD_FAILED: 'ファイルのアップロードに失敗しました',
} as const