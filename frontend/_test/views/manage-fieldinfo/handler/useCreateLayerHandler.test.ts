import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ref } from 'vue'
import { useCreateLayerHandler } from '@/views/manage-fieldinfo/handler/useCreateLayerHandler'
import type { DrawRef } from '@/types/maplibre'

describe('useCreateLayerHandler', () => {
  let mockDraw: DrawRef
  let mockDrawInstance: {
    on: Mock
    off: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockDrawInstance = {
      on: vi.fn(),
      off: vi.fn(),
    }
    mockDraw = ref(mockDrawInstance as any)
  })

  describe('初期化', () => {
    it('初期値が正しく設定されている', () => {
      const { isOpenDialog } = useCreateLayerHandler(mockDraw)

      expect(isOpenDialog.value).toBe(false)
    })

    it('必要なプロパティとメソッドがエクスポートされている', () => {
      const handler = useCreateLayerHandler(mockDraw)

      expect(handler.isOpenDialog).toBeDefined()
      expect(handler.drawOnFinish).toBeDefined()
      expect(handler.drawOffFinish).toBeDefined()
    })
  })

  describe('drawOnFinish', () => {
    it('drawインスタンスにfinishイベントリスナーを登録する', () => {
      const { drawOnFinish } = useCreateLayerHandler(mockDraw)

      drawOnFinish()

      expect(mockDrawInstance.on).toHaveBeenCalledWith('finish', expect.any(Function))
    })

    it('drawがnullの場合は何もしない', () => {
      mockDraw.value = null
      const { drawOnFinish } = useCreateLayerHandler(mockDraw)

      drawOnFinish()

      expect(mockDrawInstance.on).not.toHaveBeenCalled()
    })
  })

  describe('drawOffFinish', () => {
    it('drawインスタンスからfinishイベントリスナーを削除する', () => {
      const { drawOffFinish } = useCreateLayerHandler(mockDraw)

      drawOffFinish()

      expect(mockDrawInstance.off).toHaveBeenCalledWith('finish', expect.any(Function))
    })

    it('drawがnullの場合は何もしない', () => {
      mockDraw.value = null
      const { drawOffFinish } = useCreateLayerHandler(mockDraw)

      drawOffFinish()

      expect(mockDrawInstance.off).not.toHaveBeenCalled()
    })

    it('onとoffで同じ関数が使用される', () => {
      const { drawOnFinish, drawOffFinish } = useCreateLayerHandler(mockDraw)

      drawOnFinish()
      drawOffFinish()

      const onCallback = mockDrawInstance.on.mock.calls[0][1]
      const offCallback = mockDrawInstance.off.mock.calls[0][1]

      expect(onCallback).toBe(offCallback)
    })
  })

  describe('ダイアログ制御', () => {
    it('finishイベントでダイアログが開く', () => {
      const { drawOnFinish, isOpenDialog } = useCreateLayerHandler(mockDraw)

      drawOnFinish()

      // finishイベントハンドラーを取得して実行
      const finishHandler = mockDrawInstance.on.mock.calls[0][1]
      finishHandler()

      expect(isOpenDialog.value).toBe(true)
    })

    it('複数回finishイベントが発生してもダイアログ状態が正しく更新される', () => {
      const { drawOnFinish, isOpenDialog } = useCreateLayerHandler(mockDraw)

      drawOnFinish()

      const finishHandler = mockDrawInstance.on.mock.calls[0][1]
      
      // 最初のfinish
      finishHandler()
      expect(isOpenDialog.value).toBe(true)

      // ダイアログを閉じる
      isOpenDialog.value = false
      expect(isOpenDialog.value).toBe(false)

      // 二回目のfinish
      finishHandler()
      expect(isOpenDialog.value).toBe(true)
    })
  })

  describe('イベントライフサイクル', () => {
    it('onとoffを順序通り呼び出すことができる', () => {
      const { drawOnFinish, drawOffFinish } = useCreateLayerHandler(mockDraw)

      // イベントリスナーを登録
      drawOnFinish()
      expect(mockDrawInstance.on).toHaveBeenCalledTimes(1)

      // イベントリスナーを削除
      drawOffFinish()
      expect(mockDrawInstance.off).toHaveBeenCalledTimes(1)

      // 再度登録
      drawOnFinish()
      expect(mockDrawInstance.on).toHaveBeenCalledTimes(2)
    })

    it('複数回onを呼び出すと複数回イベントリスナーが登録される', () => {
      const { drawOnFinish } = useCreateLayerHandler(mockDraw)

      drawOnFinish()
      drawOnFinish()
      drawOnFinish()

      expect(mockDrawInstance.on).toHaveBeenCalledTimes(3)
    })
  })
})