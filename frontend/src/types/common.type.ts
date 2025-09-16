// 共通的なダイアログタイプ
export type DialogType =
  | 'rotationAngle'
  | 'gridEW'
  | 'gridNS'
  | 'buffer'
  | 'baseFertilizationAmount'
  | 'variableFertilizationRangeRate'
  | ''

// 汎用的なアラートタイプ
export type AlertType = 'Info' | 'Error' | 'Warning' | 'Success'

// 汎用的なステータス型
export type Status = 'pending' | 'loading' | 'success' | 'error'
