import { ErrorCategory } from '@/types/error'
import { ErrorSeverity } from '@/types/error'

export const ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]: {
    [ErrorSeverity.MEDIUM]: 'ネットワーク接続を確認してください',
    [ErrorSeverity.HIGH]: 'サーバーとの通信に失敗しました。しばらく待ってから再試行してください',
  },
  [ErrorCategory.GEOSPATIAL]: {
    [ErrorSeverity.MEDIUM]: '地図データの処理中にエラーが発生しました',
    [ErrorSeverity.HIGH]: '空間データの形式が正しくありません',
  },
} as const
